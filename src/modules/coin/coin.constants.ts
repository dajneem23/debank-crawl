import { env } from 'process';

export const PRICE_STACK_SIZE = 100;

export const PRICE_PRECISION = 5;

export const FETCH_MARKET_DATA_INTERVAL = env.MARKETCAP_FETCH_INTERVAL;

export const FETCH_MARKET_DATA_DURATION = 5 * 60 * 1000;
