// desc: Create a new TESTNET dev account and fund it with 10,000 XLM from friendbot
// Usage: node scripts/account-create-dev.js
import { Keypair } from '@stellar/stellar-sdk';

const keypair = Keypair.random();
const res = await fetch(`https://friendbot.stellar.org?addr=${keypair.publicKey()}`);
const body = await res.json();

if (!res.ok) {
  console.error('Friendbot funding failed:', body);
  process.exit(1);
}

console.log('Public key:', keypair.publicKey());
console.log('Secret key:', keypair.secret());
console.log('Funded with 10000 XLM on testnet - tx:', body.hash);
