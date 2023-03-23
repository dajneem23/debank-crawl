export const QUOTE_TOKENS = {
  //order by priority
  ETH: ['USDC', 'USDT'],
  BSC: ['USDC', 'USDT', 'BUSD'],
  BNB: ['USDC', 'USDT', 'BUSD'],
};

export const QUOTE_TOKEN_DECIMALS = {
  USDC: {
    1: 6,
    ETH: 6,

    56: 18,
    BSC: 18,
    BNB: 18,
  },
  USDT: {
    1: 6,
    ETH: 6,

    56: 18,
    BSC: 18,
    BNB: 18,
  },
  BUSD: {
    1: 18,
    ETH: 18,

    56: 18,
    BSC: 18,
    BNB: 18,
  },
};
