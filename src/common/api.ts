import { env } from 'process';
import axios from 'axios';

/**
 * @description CoinMarketCap API
 * @see https://coinmarketcap.com/api/documentation/v1/
 */
export const CoinMarketCapAPI = {
  /**
   *  @description CoinMarketCap host
   */
  HOST: 'https://pro-api.coinmarketcap.com',
  /**
   * @description limit of coins per page
   */

  /**
   *  @description Endpoints that return data around cryptocurrencies such as ordered cryptocurrency lists or price and volume data.
   *  @see https://coinmarketcap.com/api/documentation/v1/#tag/cryptocurrency
   */
  cryptocurrency: {
    LIMIT: 200,

    INTERVAL: env.MARKETCAP_FETCH_INTERVAL,
    /**
     *  @description Returns a paginated list of most recently added cryptocurrencies.
     *  @see https://coinmarketcap.com/api/documentation/v1/#operation/getV1CryptocurrencyListingsNew
     */
    listingsNew: '/v1/cryptocurrency/listings/new',
    /**
     *  @description Returns a paginated list of all active cryptocurrencies with latest market data. The default "market_cap" sort returns cryptocurrency in order of CoinMarketCap's market cap rank (as outlined in our methodology) but you may configure this call to order by another market ranking field. Use the "convert" option to return market values in multiple fiat and cryptocurrency conversions in the same call.
     *  @see https://coinmarketcap.com/api/documentation/v1/#operation/getV1CryptocurrencyListingsLatest
     */
    listingsLatest: '/v1/cryptocurrency/listings/latest',
    /**
     * @description Returns a ranked and sorted list of all cryptocurrencies for a historical UTC date.
     * @see https://coinmarketcap.com/api/documentation/v1/#operation/getV1CryptocurrencyListingsHistorical
     */
    historical: '/v1/cryptocurrency/listings/historical',
    /**
     * @description  - The CoinMarketCap ID of the cryptocurrency to return OHLCV data for. Multiple IDs can be comma-separated to return data for multiple cryptocurrencies in a single call.
     * @see https://coinmarketcap.com/api/documentation/v1/#operation/getV2CryptocurrencyOhlcvLatest
     */
    ohlcvLastest: '/v2/cryptocurrency/ohlcv/latest',
    /**
     *  @description Returns the latest market quote for 1 or more cryptocurrencies. Use the "convert" option to return market values in multiple fiat and cryptocurrency conversions in the same call.
     *  @see https://coinmarketcap.com/api/documentation/v1/#operation/getV2CryptocurrencyQuotesHistorical
     */
    quotesLatest: '/v2/cryptocurrency/quotes/latest',
    /**
     *  @description Returns information about all coin categories available on CoinMarketCap. Includes a paginated list of cryptocurrency quotes and metadata from each category.
     *  @see https://coinmarketcap.com/api/documentation/v1/#operation/getV1CryptocurrencyCategories
     */
    categories: '/v1/cryptocurrency/categories',
    /**
     * @description Returns information about a single coin category available on CoinMarketCap. Includes a paginated list of the cryptocurrency quotes and metadata for the category.
     * @see https://coinmarketcap.com/api/documentation/v1/#operation/getV1CryptocurrencyCategory
     */
    category: 'GET /v1/cryptocurrency/category',
  },
  exchange: {
    LIMIT: 100,
    /**
     *  @description
     */
    DURATION: 5 * 60 * 1000,
    /**
     *  @description schedule of fetching data
     */
    INTERVAL: env.MARKETCAP_FETCH_SCHEDULE,
    /**
     * @description Returns all static metadata for one or more exchanges. This information includes details like launch date, logo, official website URL, social links, and market fee documentation URL.
     * @see https://coinmarketcap.com/api/documentation/v1/#operation/getV1ExchangeInfo
     */
    info: '/v1/exchange/info',
    /**
     *  @description Returns a paginated list of all active cryptocurrency exchanges by CoinMarketCap ID. We recommend using this convenience endpoint to lookup and utilize our unique exchange id across all endpoints as typical exchange identifiers may change over time
     *  @see https://coinmarketcap.com/api/documentation/v1/#operation/getV1ExchangeMap
     */
    map: '/v1/exchange/map',
    /**
     * @description Returns a paginated list of all cryptocurrency exchanges including the latest aggregate market data for each exchange. Use the "convert" option to return market values in multiple fiat and cryptocurrency conversions in the same call.
     * @see https://coinmarketcap.com/api/documentation/v1/#operation/getV1ExchangeListingsLatest
     */
    listingsLatest: '/v1/exchange/listings/latest',
    /**
     *  @description Returns the latest aggregate market data for 1 or more exchanges. Use the "convert" option to return market values in multiple fiat and cryptocurrency conversions in the same call.
     *  @see https://coinmarketcap.com/api/documentation/v1/#operation/getV1ExchangeQuotesLatest
     */
    quotesLatest: '/v2/exchange/quotes/latest',

    /**
     * @description Returns an interval of historic quotes for any exchange based on time and interval parameters.
     * @see https://coinmarketcap.com/api/documentation/v1/#operation/getV1ExchangeQuotesHistorical
     */
    quotesHistorical: '/v2/exchange/quotes/historical',
  },
  async fetchCoinMarketCapAPI({ params = {}, endpoint }: { endpoint: string; params?: any }): Promise<any> {
    return axios.get(`${CoinMarketCapAPI.HOST}${endpoint}`, {
      params,
      headers: {
        'X-CMC_PRO_API_KEY': env.COINMARKETCAP_API_KEY,
      },
    });
  },
};
