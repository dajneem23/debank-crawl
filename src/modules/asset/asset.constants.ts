import { env } from 'process';

export const PRICE_STACK_SIZE = 100;

export const FETCH_MARKET_DATA_INTERVAL = env.MARKETCAP_FETCH_INTERVAL || 3600000;

export const FETCH_MARKET_DATA_DURATION = 5 * 60 * 1000;
