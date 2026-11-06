// desc: Fund a TESTNET account with XLM (friendbot or from your own account)
// Usage: node scripts/xlm-fund-testnet.js  (prompts for method: friendbot or custom amount)
// Testnet only.
import { Asset, Horizon, Keypair, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { getNetworkConfig } from '../lib/network.js';
import { ask } from '../lib/prompt.js';

const method = (await ask('1) Friendbot (10000 XLM)  2) Custom amount from source account\nChoice [1]: ')) || '1';

if (method === '1') {
  const publicKey = await ask('Testnet public key to fund: ');
  const res = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`);
  const body = await res.json();

  if (!res.ok) {
    console.error('Funding failed:', body);
    process.exit(1);
  }

  console.log('Funded:', publicKey, '-', body.hash ?? 'ok');
  process.exit(0);
}

const sourceSecret = await ask('Source (funded testnet) secret: ');
const destination = await ask('Destination public key to fund: ');
const amount = (await ask('Amount of XLM to send [20]: ')) || '20';

const { horizonUrl, networkPassphrase } = getNetworkConfig('testnet');
const server = new Horizon.Server(horizonUrl);
const keypair = Keypair.fromSecret(sourceSecret);

const account = await server.loadAccount(keypair.publicKey());

const destinationExists = await server
  .loadAccount(destination)
  .then(() => true)
  .catch(() => false);

const tx = new TransactionBuilder(account, {
  fee: await server.fetchBaseFee(),
  networkPassphrase,
})
  .addOperation(
    destinationExists
      ? Operation.payment({ destination, asset: Asset.native(), amount })
      : Operation.createAccount({ destination, startingBalance: amount }),
  )
  .setTimeout(30)
  .build();

tx.sign(keypair);

try {
  const result = await server.submitTransaction(tx);
  console.log('Funded:', destination, '-', amount, 'XLM -', result.hash);
} catch (err) {
  console.error('Funding failed:', err.response?.data?.extras?.result_codes ?? err.response?.data ?? err.message);
  process.exit(1);
}
