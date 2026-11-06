#!/usr/bin/env node
// desc: Find Rahat-app wallet index + secret for a public key from mnemonic (ethers BIP-32 path)
// Given a public key + mnemonic, find the index n that matches and print its secret.
// Mirrors the app's StellarWallet.ts: ethers BIP-32 (secp256k1) at m/44'/148'/n', child privateKey used as ed25519 seed.
// NOT SEP-0005/SLIP-0010, so Freighter/Lobstr derive different addresses from the same phrase.
// Usage: node scripts/keys-find-rahat-index.js [publicKey] [maxIndex=1000]
import { createInterface } from 'node:readline';
import { Keypair } from '@stellar/stellar-sdk';
import { HDNodeWallet, Mnemonic } from 'ethers';

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

const pub = (process.argv[2] || (await promptHidden('Public key (G...): '))).trim();
const max = Number(process.argv[3] || 1000);
const mnemonic = (await promptHidden('Mnemonic: ')).trim().replace(/\s+/g, ' ');

if (!/^G[A-Z2-7]{55}$/.test(pub)) {
  console.error('Invalid public key.');
  process.exit(1);
}

const root = HDNodeWallet.fromSeed(Mnemonic.fromPhrase(mnemonic).computeSeed());
for (let i = 0; i < max; i++) {
  const kp = Keypair.fromRawEd25519Seed(Buffer.from(root.derivePath(`m/44'/148'/${i}'`).privateKey.slice(2), 'hex'));
  if (kp.publicKey() === pub) {
    console.log('Index:     ', i, `(m/44'/148'/${i}')`);
    console.log('Public Key:', kp.publicKey());
    console.log('Secret Key:', kp.secret());
    process.exit(0);
  }
}
console.error(`No match in indices 0-${max - 1}. Wrong mnemonic, or raise maxIndex.`);
process.exit(1);
