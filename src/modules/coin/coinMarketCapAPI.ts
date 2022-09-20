import env from '@/config/env';

/**
 * @description CoinMarketCap API constants
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
  SYMBOL_LIMIT: 200,

  /**
   *  @description Endpoints that return data around cryptocurrencies such as ordered cryptocurrency lists or price and volume data.
   *  @see https://coinmarketcap.com/api/documentation/v1/#tag/cryptocurrency
   */
  cryptocurrency: {
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
  },
};
