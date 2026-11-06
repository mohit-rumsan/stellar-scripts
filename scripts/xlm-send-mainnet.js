// desc: Send XLM on MAINNET (creates destination if missing, asks to confirm)
// Usage: node scripts/xlm-send-mainnet.js  (prompts)
// Sends native XLM on MAINNET. Creates destination account if it does not exist yet (min 1 XLM).
import { Asset, Horizon, Keypair, Operation, StrKey, TransactionBuilder } from '@stellar/stellar-sdk';
import { getNetworkConfig } from '../lib/network.js';
import { ask } from '../lib/prompt.js';

function resultCodes(err) {
  return err.response?.data?.extras?.result_codes ?? err.response?.data ?? err.message;
}

const senderSecret = await ask('Sender secret key: ');
const destination = await ask('Destination public key: ');
const amount = await ask('Amount of XLM to send: ');

if (!StrKey.isValidEd25519PublicKey(destination)) throw new Error('Invalid destination public key');
if (!(Number(amount) > 0)) throw new Error('Invalid amount');

const { horizonUrl, networkPassphrase } = getNetworkConfig('mainnet');
const server = new Horizon.Server(horizonUrl);

const senderKeypair = Keypair.fromSecret(senderSecret);
const senderAccount = await server.loadAccount(senderKeypair.publicKey());

const destExists = await server
  .loadAccount(destination)
  .then(() => true)
  .catch((err) => {
    if (err.response?.status === 404) return false;
    throw err;
  });

if (!destExists && Number(amount) < 1) throw new Error('Destination unfunded: send at least 1 XLM to create it');

console.log(`\nMAINNET: send ${amount} XLM\n  from ${senderKeypair.publicKey()}\n  to   ${destination}${destExists ? '' : ' (new account)'}`);
if ((await ask('Type "yes" to confirm: ')) !== 'yes') {
  console.log('Cancelled.');
  process.exit(0);
}

const op = destExists
  ? Operation.payment({ destination, asset: Asset.native(), amount })
  : Operation.createAccount({ destination, startingBalance: amount });

const tx = new TransactionBuilder(senderAccount, {
  fee: await server.fetchBaseFee(),
  networkPassphrase,
})
  .addOperation(op)
  .setTimeout(30)
  .build();

tx.sign(senderKeypair);

try {
  const result = await server.submitTransaction(tx);
  console.log('XLM sent:', result.hash);
} catch (err) {
  console.error('Send failed:', resultCodes(err));
  process.exit(1);
}
