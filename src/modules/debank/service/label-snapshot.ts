import { mgClient } from '../debank.config';

export const DOLPHIN_LABEL = {
  S: {
    id: 'DOLPHIN',
    size: 'S',
  },
  M: {
    id: 'DOLPHIN',
    size: 'M',
  },
  L: {
    id: 'DOLPHIN',
    size: 'L',
  },
};

export const WHALE_LABEL = {
  S: {
    id: 'WHALE',
    size: 'S',
  },
  M: {
    id: 'WHALE',
    size: 'M',
  },
  L: {
    id: 'WHALE',
    size: 'L',
  },
  BLUE: {
    id: 'WHALE',
    size: 'BLUE',
  },
};

export const isDolphin = (usd_value: number) => {
  if (usd_value > 100_000 && usd_value < 200_000) return DOLPHIN_LABEL.S;
  if (usd_value > 200_000 && usd_value < 500_000) return DOLPHIN_LABEL.M;
  if (usd_value > 500_000 && usd_value < 1_000_000) return DOLPHIN_LABEL.L;

  return null;
};
export const isWhale = (usd_value: number) => {
  if (usd_value > 10_000_000 && usd_value < 20_000_000) return WHALE_LABEL.S;
  if (usd_value > 20_000_000 && usd_value < 50_000_000) return WHALE_LABEL.M;
  if (usd_value > 50_000_000 && usd_value < 100_000_000) return WHALE_LABEL.L;
  if (usd_value > 100_000_000) return WHALE_LABEL.BLUE;
  return null;
};

export const isVC = async (address: string) => {
  const isVC = await mgClient.db('onchain').collection('address-book').findOne({
    address,
    tags: 'VC',
  });
  return (
    isVC && {
      id: 'VC',
    }
  );
};

export const isMM = async (address: string) => {
  const isMM = await mgClient.db('onchain').collection('address-book').findOne({
    address,
    tags: 'MM',
  });
  return (
    isMM && {
      id: 'MM',
    }
  );
};

export const isKOL = async (address: string) => {
  const isKOL = await mgClient.db('onchain').collection('address-book').findOne({
    address,
    tags: 'KOL',
  });
  return (
    isKOL && {
      id: 'KOL',
    }
  );
};

export const isSM = async (address: string) => {
  const isSM = await mgClient.db('onchain').collection('address-book').findOne({
    address,
    tags: 'SM',
  });
  return isSM && { id: 'SM' };
};
const MIN_TOKEN_FAN_USD_VALUE = 10_000;
export const isTokenFan = async ({ balance_list, usd_value }: { balance_list: any[]; usd_value: number }) => {
  const tokensFan = balance_list.filter(
    ({ amount, price }) => amount * price > MIN_TOKEN_FAN_USD_VALUE && amount * price >= usd_value / 2,
  );
  return (
    tokensFan.length && {
      id: 'TOKEN_FAN',
      tokens: tokensFan.map(({ symbol }) => symbol),
    }
  );
};
