import axios from 'axios';

export const callEtherScanAPI = async ({
  ...query
}: {
  address?: string;
  module?: string;
  startblock?: string;
  endblock?: string;
  page?: number;
  offset?: number;
  sort?: 'asc' | 'desc';
  action: string;
  apikey: string;
}) => {
  const url = new URL('https://api.etherscan.io/api');
  Object.keys(query).forEach((key) => url.searchParams.append(key, query[key]));
  const { data } = await axios.get(url.toString());
  const { status, message, result } = data;
  return { status, message, result };
};

export const checkEtherscanResponse = ({
  message,
  status,
  result,
}: {
  message: string;
  status: string;
  result: string;
}) => {
  if (status === '0' && message != 'No transactions found') {
    if (result == 'Max rate limit reached') {
      throw new Error('RATE_LIMIT');
    }
    throw new Error(message);
  }
};
export enum EtherscanJobNames {
  'etherscan:transaction:normal:by-address' = 'etherscan:transaction:normal:by-address',
}
