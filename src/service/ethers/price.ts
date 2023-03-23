import { ethers } from 'ethers';
import ERC_20_ABI from '@/common/abi/ERC_20.json';
import BEP_20_ABI from '@/common/abi/BEP_20.json';
import { BSC_RPC_MAINNET, ETH_RPC_MAINNET } from '@/common/rpc';
import { sleep } from '@/utils/common';
import Logger from '@/core/logger';
const logger = new Logger('getPairPriceAtBlock');
export const getPairPriceAtBlock = async ({
  pairAddress,
  blockNumber,
  decimals,
  chain,
}: {
  pairAddress: string;
  blockNumber: number;
  chain: 'ETH' | 1 | 'BSC' | 'BNB' | 56;
  decimals: number;
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
  retry = 5,
  retryTime = 0,
}: {
  pairAddress: string;
  blockNumber: number;
  decimals: number;
  retry?: number;
  retryTime?: number;
}) => {
  const jsonRpc = ETH_RPC_MAINNET.at(Math.floor(Math.random() * ETH_RPC_MAINNET.length))[0];
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
    logger.discord('error', 'getBSCPairPriceAtBlock', JSON.stringify({ jsonRpc, pairAddress, blockNumber, error }));
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
  const jsonRpc = BSC_RPC_MAINNET.at(Math.floor(Math.random() * BSC_RPC_MAINNET.length))[0];
  try {
    const provider = new ethers.providers.JsonRpcProvider(jsonRpc);
    // const provider = new ethers.providers.JsonRpcProvider(
    //   'https://bsc-mainnet.gateway.pokt.network/v1/lb/4cad2554fb45bda1154907a8',
    // );
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
    logger.discord('error', 'getBSCPairPriceAtBlock', JSON.stringify({ jsonRpc, pairAddress, blockNumber, error }));
    throw error;
  }
};
