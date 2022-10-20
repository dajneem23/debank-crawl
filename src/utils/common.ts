import fs from 'fs';
import { BaseQuery, T } from '@/types/Common';
import { isNull, omitBy, pick } from 'lodash';
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
  const { offset, keyword, limit = 20, sort_by, sort_order, ...filter } = reqQuery;
  return {
    filter,
    query: { offset, limit, sort_by, sort_order, keyword },
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
/**
 *  Phone number pattern
 * @example 1234567890
 */
export const PhoneNumberPattern = /^\+?[0-9]{1,3}?[0-9]{8,12}$/;

/**
 * @description ObjectId pattern
 * @see https://www.mongodb.com/docs/manual/reference/method/ObjectId/
 * @example ObjectId("6330a7c816b1ac2351a37ec9")
 */
export const ObjectIdPattern = /^[0-9a-fA-F]{24}$/;
/**
 *
 * @param item
 * @param  {Array} [keys = ['id', ...Object.keys(item)]]
 * @param {boolean} [nullable = false]
 * @returns {any}
 */
export const toOutPut = ({
  item,
  keys = ['id', ...Object.keys(item)],
  nullable = false,
}: {
  item: any;
  keys?: (string | number | symbol)[];
  nullable?: boolean;
}): {
  [key: string]: any;
} => {
  const { _id: id, ...rest } = item;
  return pick(nullable ? { id, ...rest } : omitBy({ id, ...rest }, isNull), keys);
};
type PagingOutput = {
  paging: {
    has_next: boolean;
    count: number;
    total: number;
  };
  data: any[];
};

/**
 *
 * @param {Array} items - Array of items
 * @param {Boolean} has_next - has next page
 * @param {Number} total_count - total count of items
 * @param {Array} [keys = ['id', ...Object.keys(item)]]
 * @param {boolean} [nullable = false] - nullable
 * @returns {PagingOutput} - paging output
 */
export /** */
const toPagingOutput = ({
  items,
  total_count,
  has_next,
  keys,
  nullable = false,
}: {
  items: any;
  has_next: boolean;
  total_count: number;
  keys?: string[] | (string | number | symbol)[];
  nullable?: boolean;
}): PagingOutput => {
  return {
    paging: {
      count: items.length,
      total: total_count,
      has_next,
    },
    data: items.flatMap((item: any) => toOutPut({ item, keys, nullable })),
  };
};
export const pickKeys = <T, K extends keyof T>(obj: T, keys: K[]) => {
  return pick(obj, keys) as Pick<T, K>;
};
/**
 * Create new date
 * @param {Date} date
 * @param {number} day
 * @param {number} hour
 * @param {number} minute
 * @param {number} second
 * @returns {Date} new date
 * @example
 */
export const getDateTime = ({
  date = Date.now(),
  hour = 0,
  minute = 0,
  day = 0,
  second = 0,
}: {
  date?: number;
  hour?: number;
  day?: number;
  minute?: number;
  second?: number;
}): Date => {
  return new Date(date + day * 86400000 + hour * 3600000 + minute * 60000 + second * 1000);
};
/**
 *
 * @param {number} ms  miliseconds
 * @returns {Promise} Delay for miliseconds
 */
export const sleep = (ms: number): Promise<any> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
