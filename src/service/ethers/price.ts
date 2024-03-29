import { ethers } from 'ethers';
import ERC_20_ABI from '@/common/abi/ERC_20.json';
import BEP_20_ABI from '@/common/abi/BEP_20.json';
import { sleep } from '@/utils/common';
import { Logger } from '@/core/logger';
import { getBestRPCFromRedis } from './rpc';
const logger = new Logger('getPairPriceAtBlock');
export const getPairPriceAtBlock = async ({
  pairAddress,
  blockNumber,
  decimals,
  chain,
  retry = 5,
}: {
  pairAddress: string;
  blockNumber: number;
  chain: 'ETH' | 1 | 'BSC' | 'BNB' | 56;
  decimals: number;
  retry?: number;
}): Promise<{
  price: number;
  timestamp: number;
  reserve0: number;
  reserve1: number;
  retryTime: number;
}> => {
  const handleChain = {
    ETH: getETHPairPriceAtBlock,
    BSC: getBSCPairPriceAtBlock,
    BNB: getBSCPairPriceAtBlock,
    1: getETHPairPriceAtBlock,
    56: getBSCPairPriceAtBlock,
  };
  return (
    handleChain[chain]?.call(null, {
      pairAddress,
      blockNumber,
      decimals,
      retry,
    }) ||
    (() => {
      throw new Error('Chain not supported');
    })()
  );
};

export const getETHPairPriceAtBlock = async ({
  pairAddress,
  blockNumber,
  decimals,
  retry,
  retryTime = 0,
}: {
  pairAddress: string;
  blockNumber: number;
  decimals: number;
  retry?: number;
  retryTime?: number;
}) => {
  const jsonRpc = await getBestRPCFromRedis({ chain_id: 1 });
  try {
    // const jsonRpc = 'https://eth-mainnet.gateway.pokt.network/v1/lb/4cad2554fb45bda1154907a8';
    const provider = new ethers.providers.JsonRpcProvider(jsonRpc);
    const contract = new ethers.Contract(pairAddress, ERC_20_ABI, provider);
    const [reserve0, reserve1, blockTimestampLast] = await contract.getReserves({
      blockTag: blockNumber,
    });
    const price = (reserve1 / reserve0) * 10 ** decimals;
    return {
      price,
      timestamp: blockTimestampLast,
      reserve0,
      reserve1,
      retryTime,
    };
  } catch (error) {
    if (retry > 0) {
      const re = retryTime + 1;
      await sleep(re * 2000);
      return getETHPairPriceAtBlock({
        pairAddress,
        blockNumber,
        decimals,
        retry: retry - 1,
        retryTime: re,
      });
    }
    logger.alert('error', 'getBSCPairPriceAtBlock', JSON.stringify({ jsonRpc, pairAddress, blockNumber, error }));
    throw error;
  }
};

export const getBSCPairPriceAtBlock = async ({
  pairAddress,
  blockNumber,
  decimals,
  retry = 5,
  retryTime = 0,
}: {
  pairAddress: string;
  blockNumber: number;
  decimals: number;
  retry?: number;
  retryTime?: number;
}) => {
  const jsonRpc = await getBestRPCFromRedis({ chain_id: 56 });
  try {
    const provider = new ethers.providers.JsonRpcProvider(jsonRpc.url);
    const contract = new ethers.Contract(pairAddress, BEP_20_ABI, provider);
    const [reserve0, reserve1, blockTimestampLast] = await contract.getReserves({
      blockTag: blockNumber,
    });
    const price = (reserve1 / reserve0) * 10 ** decimals;
    return {
      price,
      timestamp: blockTimestampLast,
      reserve0,
      reserve1,
      retryTime,
    };
  } catch (error) {
    if (retry > 0) {
      const re = retryTime + 1;
      await sleep(re * 2000);
      return getBSCPairPriceAtBlock({
        pairAddress,
        blockNumber,
        decimals,
        retry: retry - 1,
        retryTime: re,
      });
    }
    logger.alert('error', 'getBSCPairPriceAtBlock', JSON.stringify({ jsonRpc, pairAddress, blockNumber, error }));
    throw error;
  }
};
