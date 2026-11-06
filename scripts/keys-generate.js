// desc: Generate a random keypair (offline, not on-chain)
// Usage: node scripts/keys-generate.js
// Generates a new Stellar keypair (not yet funded/existing on-chain until friendbot funds it).
import { Keypair } from '@stellar/stellar-sdk';

const keypair = Keypair.random();
console.log('Public key:', keypair.publicKey());
console.log('Secret key:', keypair.secret());
