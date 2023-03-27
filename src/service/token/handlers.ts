import { saveAllTokensToRedis } from './func';

export const updateTokensToRedis = async function () {
  await saveAllTokensToRedis();
};
