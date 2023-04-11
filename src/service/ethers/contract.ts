import { BSC_SCAN_API_KEYS, ETHER_SCAN_API_KEYS } from '@/config/env';
import axios from 'axios';

export const getBSCContract = async ({
  address,
  apikey = BSC_SCAN_API_KEYS.at(0),
}: {
  address: string;
  apikey?: string;
}) => {
  const { data } = await axios(`https://api.bscscan.com/api`, {
    method: 'GET',
    params: {
      module: 'contract',
      action: 'getabi',
      address,
      apikey,
    },
  });
  const { result: abi, status, message } = data;
  return { abi, status, message };
};

export const getETHContract = async ({
  address,
  apikey = ETHER_SCAN_API_KEYS.at(0),
}: {
  address: string;
  apikey?: string;
}) => {
  const { data } = await axios(`https://api.etherscan.com/api`, {
    method: 'GET',
    params: {
      module: 'contract',
      action: 'getabi',
      address,
      apikey,
    },
  });
  const { result: abi, status, message } = data;
  return { abi, status, message };
};
