// desc: End-to-end TESTNET demo: sponsored account + trustline + fee-sponsored transfer
// demo-sponsor-flow.js
// Flow: Sponsor A funds + sponsors Wallet A's account creation.
//       Issuer (separate funded account) creates Asset A.
//       Sponsor B sponsors Wallet A's trustline to Asset A.
//       Issuer pays Wallet A some Asset A.
//       Wallet A -> Wallet B transfer via sendFromSponsoredBatch (fee-sponsored by B).
//
// Run: node scripts/demo-sponsor-flow.js  (testnet only, no prompts)

import {
  Keypair,
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
  Networks,
  Horizon,
} from "@stellar/stellar-sdk";

const NETWORK_PASSPHRASE = Networks.TESTNET;
const HORIZON_URL = "https://horizon-testnet.stellar.org";
const FRIENDBOT_URL = "https://friendbot.stellar.org";

const server = new Horizon.Server(HORIZON_URL);

// ---- minimal helpers to make the pasted batch function runnable ----

const MAX_TRANSFERS_PER_BATCH = 100;

class StellarOperationError extends Error {
  constructor(message, opts) {
    super(message);
    this.name = "StellarOperationError";
    this.raw = opts && opts.raw;
  }
}

function isPaymentOperationRecord(op) {
  return op.type === "payment";
}

async function submitTransaction(server, tx) {
  const result = await server.submitTransaction(tx);
  return result;
}

// ---- exact function as provided ----

async function sendFromSponsoredBatch(ctx, items) {
  if (items.length < 1 || items.length > MAX_TRANSFERS_PER_BATCH) {
    throw new RangeError(`items.length must be between 1 and ${MAX_TRANSFERS_PER_BATCH} (got ${items.length})`);
  }

  const keypairs = items.map((item) => Keypair.fromSecret(item.secret));
  const sponsorAccount = await ctx.server.loadAccount(ctx.sponsorKeypair.publicKey());

  let builder = new TransactionBuilder(sponsorAccount, {
    fee: BASE_FEE,
    networkPassphrase: ctx.networkPassphrase,
  });

  items.forEach((item, idx) => {
    builder = builder.addOperation(
      Operation.payment({
        source: keypairs[idx].publicKey(),
        destination: item.destination,
        asset: ctx.asset,
        amount: item.amount,
      })
    );
  });

  const tx = builder.setTimeout(100).build();

  tx.sign(ctx.sponsorKeypair);
  for (const kp of keypairs) {
    tx.sign(kp);
  }

  const result = await submitTransaction(ctx.server, tx);

  const opPage = await ctx.server.operations().forTransaction(result.hash).order("asc").limit(items.length).call();
  const paymentOps = opPage.records.filter(isPaymentOperationRecord);

  if (paymentOps.length !== items.length) {
    throw new StellarOperationError(
      `Expected ${items.length} payment operation(s) for batch transaction ${result.hash}, found ${paymentOps.length}`,
      { raw: opPage.records }
    );
  }

  const unmatchedOps = [...paymentOps];

  return {
    hash: result.hash,
    successful: result.successful,
    ledger: result.ledger,
    items: items.map((item, idx) => {
      const sourcePublicKey = keypairs[idx].publicKey();
      const opIndex = unmatchedOps.findIndex((op) => op.from === sourcePublicKey);
      if (opIndex === -1) {
        throw new StellarOperationError(
          `No payment operation found from beneficiary ${sourcePublicKey} in batch transaction ${result.hash}`,
          { raw: paymentOps }
        );
      }
      const [op] = unmatchedOps.splice(opIndex, 1);

      return {
        sourcePublicKey,
        destination: item.destination,
        amount: item.amount,
        paymentId: op.id,
      };
    }),
  };
}

// ---- flow ----

async function friendbotFund(publicKey) {
  const res = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(publicKey)}`);
  if (!res.ok) throw new Error(`friendbot fund failed for ${publicKey}: ${res.status}`);
}

async function main() {
  // 0. keypairs
  const sponsorA = Keypair.random();
  const sponsorB = Keypair.random();
  const walletA = Keypair.random();
  const walletB = Keypair.random();
  const issuer = Keypair.random();

  console.log("sponsorA", sponsorA.publicKey());
  console.log("sponsorB", sponsorB.publicKey());
  console.log("walletA ", walletA.publicKey());
  console.log("walletB ", walletB.publicKey());
  console.log("issuer  ", issuer.publicKey());

  // 1. fund sponsors + issuer (walletA/walletB stay at 0 XLM, fully sponsored)
  await Promise.all([
    friendbotFund(sponsorA.publicKey()),
    friendbotFund(sponsorB.publicKey()),
    friendbotFund(issuer.publicKey()),
  ]);
  console.log("funded sponsorA, sponsorB, issuer via friendbot");

  // 2. Sponsor A sponsors creation of Wallet A's account (0 XLM starting balance)
  {
    const sponsorAAccount = await server.loadAccount(sponsorA.publicKey());
    const tx = new TransactionBuilder(sponsorAAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.beginSponsoringFutureReserves({
          sponsoredId: walletA.publicKey(),
          source: sponsorA.publicKey(),
        })
      )
      .addOperation(
        Operation.createAccount({
          destination: walletA.publicKey(),
          startingBalance: "0",
          source: sponsorA.publicKey(),
        })
      )
      .addOperation(
        Operation.endSponsoringFutureReserves({
          source: walletA.publicKey(),
        })
      )
      .setTimeout(60)
      .build();

    tx.sign(sponsorA, walletA);
    const result = await server.submitTransaction(tx);
    console.log("sponsorA created walletA account:", result.hash);
  }

  // 3. Issuer creates Asset A (assets aren't "created" on-chain explicitly —
  //    defined by code+issuer, materialized once a trustline + payment exist)
  const assetA = new Asset("ASSETA", issuer.publicKey());

  // 4. Sponsor B sponsors Wallet A's trustline to Asset A
  {
    const sponsorBAccount = await server.loadAccount(sponsorB.publicKey());
    const tx = new TransactionBuilder(sponsorBAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.beginSponsoringFutureReserves({
          sponsoredId: walletA.publicKey(),
          source: sponsorB.publicKey(),
        })
      )
      .addOperation(
        Operation.changeTrust({
          asset: assetA,
          source: walletA.publicKey(),
        })
      )
      .addOperation(
        Operation.endSponsoringFutureReserves({
          source: walletA.publicKey(),
        })
      )
      .setTimeout(60)
      .build();

    tx.sign(sponsorB, walletA);
    const result = await server.submitTransaction(tx);
    console.log("sponsorB sponsored walletA trustline:", result.hash);
  }

  // 5. Issuer pays Wallet A some Asset A so there's something to transfer
  {
    const issuerAccount = await server.loadAccount(issuer.publicKey());
    const tx = new TransactionBuilder(issuerAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.payment({
          destination: walletA.publicKey(),
          asset: assetA,
          amount: "100",
        })
      )
      .setTimeout(60)
      .build();

    tx.sign(issuer);
    const result = await server.submitTransaction(tx);
    console.log("issuer funded walletA with 100 ASSETA:", result.hash);
  }

  // 6. Sponsor B also creates a plain account for Wallet B (needs a trustline
  //    to receive ASSETA too — friendbot-fund it then add its own trustline).
  await friendbotFund(walletB.publicKey());
  {
    const walletBAccount = await server.loadAccount(walletB.publicKey());
    const tx = new TransactionBuilder(walletBAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(Operation.changeTrust({ asset: assetA }))
      .setTimeout(60)
      .build();

    tx.sign(walletB);
    const result = await server.submitTransaction(tx);
    console.log("walletB opened its own trustline:", result.hash);
  }

  // 7. Wallet A -> Wallet B, fee sponsored by Sponsor B, via sendFromSponsoredBatch
  const ctx = {
    server,
    sponsorKeypair: sponsorB,
    asset: assetA,
    networkPassphrase: NETWORK_PASSPHRASE,
  };

  const items = [
    {
      secret: walletA.secret(),
      destination: walletB.publicKey(),
      amount: "10",
    },
  ];

  const result = await sendFromSponsoredBatch(ctx, items);
  console.log("batch transfer result:", JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
