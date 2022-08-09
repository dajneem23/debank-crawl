import fs from 'fs';
import { BaseQuery } from '@/types/Common';

/**
 * Get runtime config from "process" Nodejs
 */
export const getRuntimeEnv = (key: string, defaultValue?: any): string => {
  if (typeof process.env[key] === 'undefined') {
    if (typeof defaultValue !== 'undefined') {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not set.`);
  }
  return process.env[key];
};

/**
 * Read and parse JSON file
 */
export const parseJSONFromFile = (filepath: string) => {
  try {
    const raw = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return;
  }
};

/**
 * Throw an error
 */
export const throwErr = (err: Error | any): void => {
  throw err;
};

/**
 * Get filter and query from Express request query
 */
export const buildQueryFilter = <T>(reqQuery: BaseQuery & T) => {
  const { page, per_page, sort_by, sort_order, ...filter } = reqQuery;
  return {
    filter,
    query: { page, per_page, sort_by, sort_order },
  };
};

/**
 * Remove leading Zero from a string
 *
 * @example
 * const text = removeLeadingZeroFromString('Phuong 09');
 * console.log(text); // Phuong 9
 */
export const removeLeadingZeroFromString = (name: string) => {
  // Regex to remove leading 0 from a string
  const regex = new RegExp('^0+(?!$)', 'g');
  const arr = name.split(' ');
  return arr.map((txt) => txt.replace(regex, '')).join(' ');
};

/**
 * Convert Bytes to Megabytes
 */
export const convertBytesToMB = (bytes: number) => {
  return bytes / 1024 / 1024;
};

export type KeysOfType<O, T> = {
  [K in keyof O]: O[K] extends T ? K : never;
}[keyof O];

export const PhoneNumberPattern = /^\+?[0-9]{1,3}?[0-9]{8,12}$/;
