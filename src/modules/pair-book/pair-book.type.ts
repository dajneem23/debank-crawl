const BSC_CHAIN = {
  chainId: 56,
  chainName: 'Binance Smart Chain',
  defillamaId: 'bsc',
  pairBookId: 'bsc',
  alias: ['bsc', 'bnb'],
};

export const PairBookChainIds = {
  ethereum: {
    chainId: 1,
    chainName: 'Ethereum',
    defillamaId: 'ethereum',
    pairBookId: 'ethereum',
    alias: ['eth', 'ethereum'],
  },
  bsc: BSC_CHAIN,
  bnb: BSC_CHAIN,
  polygon: {
    chainId: 137,
    chainName: 'Polygon',
    defillamaId: 'polygon',
    pairBookId: 'polygon',
    alias: ['polygon'],
  },
};
