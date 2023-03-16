export const getMgOnChainDbName = () => {
  return process.env.MODE == 'production' ? 'onchain' : 'onchain-dev';
};
