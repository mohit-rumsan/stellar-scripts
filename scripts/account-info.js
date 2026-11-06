// desc: Show balances, signers, thresholds of an account
// Usage: node scripts/account-info.js  (prompts for public key and network)
import { Horizon } from '@stellar/stellar-sdk';
import { getNetworkConfig } from '../lib/network.js';
import { ask } from '../lib/prompt.js';

const network = (await ask('Network (testnet/mainnet) [testnet]: ')) || 'testnet';
const publicKey = await ask('Account public key: ');

const { horizonUrl } = getNetworkConfig(network);
const server = new Horizon.Server(horizonUrl);

const account = await server.loadAccount(publicKey);

console.log('Public key:', account.account_id);
console.log('Sequence:', account.sequence);
console.log('Balances:');
for (const b of account.balances) {
  const label = b.asset_type === 'native' ? 'XLM' : `${b.asset_code}:${b.asset_issuer}`;
  console.log(`  ${label} = ${b.balance}`);
}
console.log('Signers:');
for (const s of account.signers) {
  console.log(`  ${s.key} weight=${s.weight} type=${s.type}`);
}
console.log('Thresholds:', account.thresholds);
