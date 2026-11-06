# AGENTS.md

Guide for AI agents working in this repo. Small, standalone Node.js (ESM) scripts for Stellar operations used by the Rahat project. Built on `@stellar/stellar-sdk` and Horizon.

## Layout

- `scripts/*.js` — one task per file. Line 1 (or 2, after a shebang) is `// desc: ...`. `run.sh` reads that line to build the menu and help. Every new script needs that line.
- `lib/network.js` — `getNetworkConfig(network)` returns `{ horizonUrl, networkPassphrase }`. Default is testnet. `mainnet` or `public` selects mainnet.
- `lib/prompt.js` — `ask(question)` reads one line from stdin.
- `run.sh` — menu (`./run.sh`), help (`./run.sh help`), direct run (`./run.sh <name>`).
- `help.sh` — same as `./run.sh help`.

## Which script for which task

| Task | Script | Network |
|---|---|---|
| New random keypair, offline | `keys-generate` | none |
| Public/secret key from a secret key or a standard (SEP-0005) mnemonic, as Freighter/Lobstr derive it | `keys-derive [index]` | none |
| Recover the secret of a **Rahat app** wallet from its public key and mnemonic | `keys-find-rahat-index [pubkey] [maxIndex]` | none |
| Check balances, signers, thresholds | `account-info` | either |
| Create an account with 0 XLM, reserve paid by a sponsor | `account-create-sponsored` | either |
| Get testnet XLM (friendbot, or send from a funded account) | `xlm-fund-testnet` | testnet only |
| Send XLM on mainnet (creates the destination account if missing) | `xlm-send-mainnet` | mainnet only |
| Let a wallet hold an asset (change trust) | `asset-trustline` | either |
| Create a new asset and mint the first supply to a distributor | `asset-issue` | either |
| Send a custom asset (the destination needs a trustline first) | `asset-send` | either |
| Full sponsorship demo with random throwaway accounts | `demo-sponsor-flow` | testnet only |

Typical order for a new token on testnet: `keys-generate` (issuer, distributor, user) → `xlm-fund-testnet` each → `asset-issue` → `asset-trustline` (user) → `asset-send` → `account-info` to verify.

## Key derivation: two schemes

- `keys-derive` uses SEP-0005 (SLIP-0010 ed25519, `m/44'/148'/n'`). Wallets such as Freighter and Lobstr use this scheme.
- `keys-find-rahat-index` matches the Rahat app's `StellarWallet.ts`: ethers BIP-32 (secp256k1) at `m/44'/148'/n'`. The script uses the child private key as the ed25519 seed. The same mnemonic gives **different** addresses under the two schemes. If an address from a Rahat mnemonic does not match, use this script.

## Rules for agents

- Scripts are interactive. They prompt for secrets on stdin. Do not hardcode secrets, do not commit secrets, and do not put secrets in command-line arguments or logs.
- Never run a mainnet script (`xlm-send-mainnet`, or any script with `mainnet` entered at the prompt) unless the user asks for it explicitly. Mainnet transactions spend real funds and cannot be undone.
- To check that a script loads without running it: `node --check scripts/<name>.js`.
- Keep one task per file and reuse `lib/`. Submit errors print `err.response?.data?.extras?.result_codes`, keep that pattern.
- Add a script: create `scripts/<group>-<action>.js` with a `// desc:` line. Groups: `keys`, `account`, `xlm`, `asset`, `demo`. Then add a row to the table above and to `README.md`.
