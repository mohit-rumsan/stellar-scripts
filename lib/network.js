import { Networks } from '@stellar/stellar-sdk';

// network arg (CLI) controls mainnet vs testnet. Default testnet.
export function getNetworkConfig(network = 'testnet') {
  const isMainnet = network === 'mainnet' || network === 'public';
  return {
    horizonUrl: isMainnet
      ? 'https://horizon.stellar.org'
      : 'https://horizon-testnet.stellar.org',
    networkPassphrase: isMainnet ? Networks.PUBLIC : Networks.TESTNET,
  };
}
