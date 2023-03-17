import { join } from 'path';

export const CACHE_PATH = join(__dirname, '..', '..', '.cache', 'cacache');
import cacache from 'cacache';

export const getCacheKey = async ({ key, path = CACHE_PATH }: { key: string; path?: string }) => {
  try {
    const data = await cacache.get(path, key);
    return data;
  } catch (error) {
    return null;
  }
};

export const getDecodedJSONCacheKey = async ({ key }: { key: string }) => {
  try {
    const cacheData = await cacache.get(CACHE_PATH, key);
    const dataJSON = JSON.parse(Buffer.from(cacheData.data.toString(), 'base64').toString());
    dataJSON.body = Buffer.from(dataJSON.body, 'base64');
    return {
      ...cacheData,
      data: dataJSON,
    };
  } catch (error) {
    return null;
  }
};

export const clearCache = async () => {
  await cacache.rm.all(CACHE_PATH);
};
