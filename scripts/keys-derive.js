#!/usr/bin/env node
// desc: Get public/secret key from a secret key or mnemonic (SEP-0005, Freighter/Lobstr compatible)
// Derive Stellar public/secret key from a secret key or a BIP39 mnemonic.
// Usage: node scripts/keys-derive.js [accountIndex]
import { createInterface } from 'node:readline';
import { Keypair } from '@stellar/stellar-sdk';
import StellarHDWallet from 'stellar-hd-wallet';

const index = Number(process.argv[2] || 0);

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const output = rl._writeToOutput;
    let muted = false;
    rl._writeToOutput = (chunk) => {
      if (!muted) output.call(rl, chunk);
    };
    rl.question(question, (answer) => {
      rl._writeToOutput = output;
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    muted = true;
  });
}

const input = (await promptHidden('Enter secret key or phrase: ')).trim();

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
