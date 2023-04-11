import Container from 'typedi';
import { DIRedisClient } from '@/loaders/redis.loader';

export const CHAINS_ALIASES = {
  '1': 1,
  ETH: 1,
  56: 56,
  BSC: 56,
  BNB: 56,
};
type RPC = {
  url: string;
  height: number;
  latency: string;
  score: boolean;
  privacy: boolean;
};

export const getRPCsFromRedis = async function ({ chain_id }: { chain_id: number }): Promise<RPC[]> {
  const redis = Container.get(DIRedisClient);
  const key = await redis.get(`rpc_server_${CHAINS_ALIASES[chain_id]}`);
  const rpcs = key ? JSON.parse(key) : null;
  return rpcs;
};
export const getBestRPCFromRedis = async function ({ chain_id }: { chain_id: number }): Promise<RPC> {
  const rpcs = (await getRPCsFromRedis({ chain_id }))
    .filter(({ score }) => score)
    .sort((a, b) => +a.latency - +b.latency);
  const bestRPC = rpcs[0];
  return bestRPC;
};
