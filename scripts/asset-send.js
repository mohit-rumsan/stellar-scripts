// desc: Send a custom asset to a wallet that already trusts it
// Usage: node scripts/asset-send.js  (prompts)
// Sends a custom asset from main wallet to destination wallet. Destination must already trust the asset.
import { Asset, Horizon, Keypair, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { getNetworkConfig } from '../lib/network.js';
import { ask } from '../lib/prompt.js';

function resultCodes(err) {
  return err.response?.data?.extras?.result_codes ?? err.response?.data ?? err.message;
}

const network = (await ask('Network (testnet/mainnet) [testnet]: ')) || 'testnet';
const senderSecret = await ask('Main wallet secret key: ');
const destinationPublic = await ask('Destination public key: ');
const assetCode = await ask('Asset code (e.g. USDC): ');
const assetIssuer = await ask('Asset issuer public key: ');
const amount = await ask('Amount to send: ');

const { horizonUrl, networkPassphrase } = getNetworkConfig(network);
const server = new Horizon.Server(horizonUrl);

const senderKeypair = Keypair.fromSecret(senderSecret);
const asset = new Asset(assetCode, assetIssuer);

const senderAccount = await server.loadAccount(senderKeypair.publicKey());

const tx = new TransactionBuilder(senderAccount, {
  fee: await server.fetchBaseFee(),
  networkPassphrase,
})
  .addOperation(Operation.payment({ destination: destinationPublic, asset, amount }))
  .setTimeout(30)
  .build();

tx.sign(senderKeypair);

try {
  const result = await server.submitTransaction(tx);
  console.log('Payment sent:', result.hash);
} catch (err) {
  console.error('Payment failed:', resultCodes(err));
  process.exit(1);
}
