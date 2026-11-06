// desc: Add a trustline so a wallet can hold an asset
// Usage: node scripts/asset-trustline.js  (prompts for each input)
import { Asset, Horizon, Keypair, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { getNetworkConfig } from '../lib/network.js';
import { ask } from '../lib/prompt.js';

const network = (await ask('Network (testnet/mainnet) [testnet]: ')) || 'testnet';
const assetIssuer = await ask('Asset issuer public key: ');
const assetName = await ask('Asset code (e.g. USDC): ');
const walletSecret = await ask('Wallet secret (beneficiary): ');
const limit = (await ask('Trustline limit (blank = default max): ')) || undefined;

const { horizonUrl, networkPassphrase } = getNetworkConfig(network);
const server = new Horizon.Server(horizonUrl);

const keypair = Keypair.fromSecret(walletSecret);
const asset = new Asset(assetName, assetIssuer);

const account = await server.loadAccount(keypair.publicKey());

const tx = new TransactionBuilder(account, {
  fee: await server.fetchBaseFee(),
  networkPassphrase,
})
  .addOperation(Operation.changeTrust({ asset, limit }))
  .setTimeout(30)
  .build();

tx.sign(keypair);

try {
  const result = await server.submitTransaction(tx);
  console.log('Trustline created:', result.hash);
} catch (err) {
  console.error('Failed:', err.response?.data?.extras?.result_codes ?? err.response?.data ?? err.message);
  process.exit(1);
}
