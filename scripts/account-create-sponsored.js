// desc: Create a new 0-XLM account whose reserve is paid by a sponsor
// Usage: node scripts/account-create-sponsored.js  (prompts for each input)
// Sponsors the creation of a NEW wallet: sponsor pays the base reserve,
// so the new account is created on-chain with a 0 XLM starting balance.
import { Horizon, Keypair, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { getNetworkConfig } from '../lib/network.js';
import { ask } from '../lib/prompt.js';

const network = (await ask('Network (testnet/mainnet) [testnet]: ')) || 'testnet';
const sponsorSecret = await ask('Sponsor secret key: ');

const makeNew = ((await ask('Generate new wallet keypair? (y/n) [y]: ')) || 'y').toLowerCase();
// The new account must sign: it is the source of endSponsoringFutureReserves.
let destinationKeypair;
if (makeNew !== 'n') {
  destinationKeypair = Keypair.random();
  console.log('New wallet public key:', destinationKeypair.publicKey());
  console.log('New wallet secret key:', destinationKeypair.secret());
} else {
  destinationKeypair = Keypair.fromSecret(await ask('Destination (new/unfunded) secret key: '));
}
const destination = destinationKeypair.publicKey();

const startingBalance = (await ask('Starting XLM balance [0]: ')) || '0';

const { horizonUrl, networkPassphrase } = getNetworkConfig(network);
const server = new Horizon.Server(horizonUrl);

const sponsorKeypair = Keypair.fromSecret(sponsorSecret);
const sponsorAccount = await server.loadAccount(sponsorKeypair.publicKey());

const tx = new TransactionBuilder(sponsorAccount, {
  fee: await server.fetchBaseFee(),
  networkPassphrase,
})
  .addOperation(
    Operation.beginSponsoringFutureReserves({ sponsoredId: destination }),
  )
  .addOperation(
    Operation.createAccount({ destination, startingBalance }),
  )
  .addOperation(Operation.endSponsoringFutureReserves({ source: destination }))
  .setTimeout(30)
  .build();

tx.sign(sponsorKeypair);
tx.sign(destinationKeypair);

try {
  const result = await server.submitTransaction(tx);
  console.log('Wallet sponsored:', destination, '- tx:', result.hash);
  console.log('Sponsored reserve: 1 XLM (2 base reserves) paid by sponsor');
  console.log('Send some XLM later so it can pay fees (see xlm-fund-testnet.js).');
} catch (err) {
  console.error('Sponsorship failed:', err.response?.data?.extras?.result_codes ?? err.response?.data ?? err.message);
  process.exit(1);
}
