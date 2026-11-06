// desc: Issue a new asset: distributor trusts it, issuer mints initial amount
// Usage: node scripts/asset-issue.js  (prompts)
// Issues a new asset: distributor trusts it, then issuer pays distributor the initial amount.
import { Asset, Horizon, Keypair, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { getNetworkConfig } from '../lib/network.js';
import { ask } from '../lib/prompt.js';

function resultCodes(err) {
  return err.response?.data?.extras?.result_codes ?? err.response?.data ?? err.message;
}

const network = (await ask('Network (testnet/mainnet) [testnet]: ')) || 'testnet';
const issuerSecret = await ask('Issuer secret: ');
const assetCode = await ask('Asset code (e.g. MYTOKEN): ');
const distributorSecret = await ask('Distributor secret (holds the asset): ');
const amount = await ask('Initial amount to issue: ');

const { horizonUrl, networkPassphrase } = getNetworkConfig(network);
const server = new Horizon.Server(horizonUrl);

const issuerKeypair = Keypair.fromSecret(issuerSecret);
const distributorKeypair = Keypair.fromSecret(distributorSecret);
const asset = new Asset(assetCode, issuerKeypair.publicKey());

const distributorAccount = await server.loadAccount(distributorKeypair.publicKey());
const trustTx = new TransactionBuilder(distributorAccount, {
  fee: await server.fetchBaseFee(),
  networkPassphrase,
})
  .addOperation(Operation.changeTrust({ asset }))
  .setTimeout(30)
  .build();
trustTx.sign(distributorKeypair);

try {
  const trustResult = await server.submitTransaction(trustTx);
  console.log('Trustline established:', trustResult.hash);
} catch (err) {
  console.error('Trustline failed:', resultCodes(err));
  process.exit(1);
}

const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
const payTx = new TransactionBuilder(issuerAccount, {
  fee: await server.fetchBaseFee(),
  networkPassphrase,
})
  .addOperation(Operation.payment({ destination: distributorKeypair.publicKey(), asset, amount }))
  .setTimeout(30)
  .build();
payTx.sign(issuerKeypair);

try {
  const payResult = await server.submitTransaction(payTx);
  console.log('Asset issued:', payResult.hash);
  console.log('Asset code:', assetCode);
  console.log('Asset issuer:', issuerKeypair.publicKey());
} catch (err) {
  console.error('Issuance payment failed:', resultCodes(err));
  process.exit(1);
}
