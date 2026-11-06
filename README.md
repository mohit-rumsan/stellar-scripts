# stellar-scripts

Command-line scripts for common Stellar tasks: keys, accounts, XLM, custom assets, and sponsored reserves. Each script prompts for its inputs. The scripts use Horizon through `@stellar/stellar-sdk`.

## Requirements

- Node.js 18 or later
- npm

## Quick start

```bash
npm install
./run.sh          # pick a script from a numbered menu
./run.sh help     # list all scripts (or ./help.sh)
./run.sh account-info   # run one script by name
```

You can also run a script with Node: `node scripts/account-info.js`.

## Scripts

| Script | What it does | Network |
|---|---|---|
| `keys-generate` | Generate a random keypair. The account does not exist on-chain until it is funded. | none |
| `keys-derive [index]` | Get the public and secret key from a secret key or a SEP-0005 mnemonic. Matches Freighter and Lobstr. | none |
| `keys-find-rahat-index [pubkey] [maxIndex]` | Search indexes 0 to `maxIndex` for a Rahat app wallet and print its secret. Uses the ethers BIP-32 path. | none |
| `account-info` | Show balances, signers, and thresholds. | testnet / mainnet |
| `account-create-sponsored` | Create a new account with 0 XLM. A sponsor pays the base reserve. | testnet / mainnet |
| `xlm-fund-testnet` | Fund a testnet account with friendbot (10,000 XLM) or from your own account. | testnet |
| `xlm-send-mainnet` | Send XLM on mainnet. Creates the destination account if it does not exist. Asks for confirmation. | mainnet |
| `asset-trustline` | Add a trustline so that a wallet can hold an asset. | testnet / mainnet |
| `asset-issue` | Issue a new asset. The distributor trusts the asset, then the issuer sends the initial supply. | testnet / mainnet |
| `asset-send` | Send a custom asset. The destination must already trust the asset. | testnet / mainnet |
| `demo-sponsor-flow` | Run a full demo with throwaway accounts: sponsored account, sponsored trustline, and fee-sponsored transfer. | testnet |

## Example: issue a token on testnet

1. Run `./run.sh keys-generate` three times: issuer, distributor, user.
2. Run `./run.sh xlm-fund-testnet` for each account.
3. Run `./run.sh asset-issue` with the issuer and distributor secrets.
4. Run `./run.sh asset-trustline` with the user secret.
5. Run `./run.sh asset-send` from the distributor to the user.
6. Run `./run.sh account-info` to check the balances.

## Two key derivation schemes

The same mnemonic gives different addresses in `keys-derive` and `keys-find-rahat-index`:

- `keys-derive` uses SEP-0005, the standard for Stellar wallets.
- `keys-find-rahat-index` uses the Rahat app derivation: ethers BIP-32 (secp256k1) at `m/44'/148'/n'`, with the child private key used as the ed25519 seed.

## Project layout

```
scripts/   one task per file; the "// desc:" line feeds run.sh
lib/       network.js (Horizon URL + passphrase), prompt.js (stdin input)
run.sh     menu, help, and direct run
help.sh    same as ./run.sh help
AGENTS.md  guide for AI agents (CLAUDE.md includes it)
```

## Security

- The scripts ask for secret keys and mnemonics at the prompt. Do not commit secrets to this repo.
- Mainnet transactions spend real XLM and cannot be undone. Check the network before you confirm.
