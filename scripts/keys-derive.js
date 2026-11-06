#!/usr/bin/env node
// desc: Get public/secret key from a secret key or mnemonic (SEP-0005, Freighter/Lobstr compatible)
// Derive Stellar public/secret key from a secret key or a BIP39 mnemonic.
// Usage: node scripts/keys-derive.js [accountIndex]
import { askHidden } from '../lib/prompt.js';
import { Keypair } from '@stellar/stellar-sdk';
import StellarHDWallet from 'stellar-hd-wallet';

const index = Number(process.argv[2] || 0);

const input = (await askHidden('Enter secret key or phrase: ')).trim();

if (!input) {
  console.error('No input provided.');
  process.exit(1);
}

let keypair;

if (input.split(/\s+/).length > 1) {
  // mnemonic -> SEP-0005 derivation
  const wallet = StellarHDWallet.fromMnemonic(input);
  keypair = Keypair.fromRawEd25519Seed(wallet.getKeypair(index).rawSecretKey());
} else {
  // raw secret key (starts with S)
  keypair = Keypair.fromSecret(input);
}

console.log('Public Key:', keypair.publicKey());
console.log('Secret Key:', keypair.secret());
