import { DexScreenerAPI } from '../../common/api';
import { DexScreenerPair } from './dexscreener.type';

export const searchPairsFromDexScreener = async ({ q }: { q: string }) => {
  const { data, status } = await DexScreenerAPI.fetch({
    endpoint: `${DexScreenerAPI.Pairs.search.endpoint}`,
    params: {
      q,
    },
  });
  const { pairs } = data;
  return { pairs } as {
    pairs: DexScreenerPair[];
  };
};
