import { Service, Token } from 'typedi';
import Logger from '@/core/logger';
import axios from 'axios';

const TOKEN_NAME = '_coingetkoService';
export const CoingetkoServiceToken = new Token<CoingeckoService>(TOKEN_NAME);
/**
 * @class CommentService
 * @description Comment service: Comment service for all comment related operations
 * @extends BaseService
 */
@Service(CoingetkoServiceToken)
export class CoingeckoService {
  private logger = new Logger('Coingecko');

  async global(): Promise<any> {
    try {
      const xml = await axios.get('https://www.coingecko.com/en/overall_stats').then((r) => r.data.toString());
      const pricePattern = /(\$.+)/g;
      const matches = xml.matchAll(pricePattern);

      const data = [];
      for (const match of matches) {
        data.push(match[0]);
      }
      const marketCap = data[0] || 0;
      const volume = data[1] || 0;

      const pattern = /<span class="tw-text-blue-500">(.+)<\/span>/g;
      const otherMatches = xml.matchAll(pattern);

      for (const match of otherMatches) {
        data.push(match[1]);
      }
      const totalCoin = data[2] || 0;
      const exchanges = data[3] || 0;
      const dominace = [data[4] || 0, data[5] || 0];
      const gas = data[6] || 0;
      return { market_cap: marketCap, volume, total_coin: totalCoin, exchanges, gas, dominace };
    } catch (err) {
      this.logger.error('get_error', err.message);
      throw err;
    }
  }
}
