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
    category: '/v1/cryptocurrency/category',
    /**
     * @description Returns price performance statistics for one or more cryptocurrencies including launch price ROI and all-time high / all-time low. Stats are returned for an all_time period by default. UTC yesterday and a number of rolling time periods may be requested using the time_period parameter. Utilize the convert parameter to translate values into multiple fiats or cryptocurrencies using historical rates.
     * @see https://coinmarketcap.com/api/documentation/v1/#operation/getV2CryptocurrencyPriceperformancestatsLatest
     */
    pricePerformanceStats: '/v2/cryptocurrency/price-performance-stats/latest',
    /**
     *  @description pricePerformanceStats limit  100 per page
     */
    pricePerformanceStatsLimit: 100,

    pricePerformanceStatsRepeatPattern: '* 0 0 * * *',
    /**
     *  @description Returns all static metadata available for one or more cryptocurrencies. This information includes details like logo, description, official website URL, social links, and links to a cryptocurrency's technical documentation.
     *  @see https://coinmarketcap.com/api/documentation/v1/#operation/getV2CryptocurrencyInfo
     */
    metaData: '/v2/cryptocurrency/info',
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
  /**
   * @description fetch data from coinmarketcap
   * @param  {Object} - { params,endpoint }
   * @returns {Promise} - { data }
   */
  fetch({ params = {}, endpoint }: { endpoint: string; params?: any }): Promise<any> {
    return axios.get(`${CoinMarketCapAPI.HOST}${endpoint}`, {
      params,
      headers: {
        'X-CMC_PRO_API_KEY': env.COINMARKETCAP_API_KEY,
      },
    });
  },
};
/**
 * @description fetch data from coinmarketcap
 * @see https://www.coingecko.com/en/api/documentation
 */
export const CoinGeckoAPI = {
  Coins: {
    list: {
      endpoint: 'https://api.coingecko.com/api/v3/coins/list',
      params: {
        include_platform: true,
      },
    },
    detail: {
      endpoint: 'https://api.coingecko.com/api/v3/coins',
      params: {
        tickers: true,
        market_data: true,
        community_data: true,
        developer_data: true,
        sparkline: true,
      },
    },
  },
  Categories: {
    list: {
      endpoint: 'https://api.coingecko.com/api/v3/coins/categories/list',
    },
    listWithMarketData: {
      endpoint: 'https://api.coingecko.com/api/v3/coins/categories',
      params: {
        //? order: market_cap_desc (default), market_cap_asc, name_desc, name_asc, market_cap_change_24h_desc and market_cap_change_24h_asc
        order: 'market_cap_desc',
      },
    },
  },
  Blockchains: {
    list: {
      endpoint: 'https://api.coingecko.com/api/v3/asset_platforms',
    },
  },
  Exchanges: {
    list: {
      endpoint: 'https://api.coingecko.com/api/v3/exchanges/list',
    },
    details: {
      endpoint: 'https://api.coingecko.com/api/v3/exchanges',
    },
  },
  Global: {
    cryptoCurrencyGlobal: {
      endpoint: 'https://api.coingecko.com/api/v3/global',
    },
  },
  /**
   * @description fetch data from coinmarketcap
   * @param  {Object} - { params,endpoint }
   * @returns {Promise} - { data }
   */
  fetch({ params = {}, endpoint }: { endpoint: string; params?: any }): Promise<any> {
    return axios.get(`${endpoint}`, {
      params,
      headers: {},
    });
  },
};

export const KyberSwapAPI = {
  AssetTrending: {
    trending: {
      endpoint: 'https://truesight.kyberswap.com/api/v1/trending',
      params: {
        timeframe: '24h',
        page_number: 0,
        page_size: 100,
      },
    },

    trending_soon: {
      endpoint: 'https://truesight.kyberswap.com/api/v1/trending-soon',
      params: {
        timeframe: '24h',
        page_number: 0,
        page_size: 100,
      },
    },
  },
  /**
   * @description fetch data from coinmarketcap
   * @param  {Object} - { params,endpoint }
   * @returns {Promise} - { data }
   */
  fetch({ params = {}, endpoint }: { endpoint: string; params?: any }): Promise<any> {
    return axios.get(`${endpoint}`, {
      params,
      headers: {},
    });
  },
};
export const DataFiAPI = {
  login(
    { username, password }: { username: string; password: string } = {
      username: env.DATAFI_USERNAME,
      password: env.DATAFI_PASSWORD,
    },
  ) {
    return axios.post(`${env.DATAFI_API_URL}/api/session`, {
      username,
      password,
    });
  },
  fetch({ params = {}, endpoint }: { endpoint: string; params?: any }): Promise<any> {
    return axios.get(`${endpoint}`, {
      params,
      headers: {},
    });
  },
};
export const DexScreenerAPI = {
  TradingHistory: {
    /**
     * @description fetch tradingHistory recent data from dexscreener
     * @param  {Object} - { params,endpoint }
     * @example { params: { q: <address>, t:timestamp} }
     */
    recent: {
      /**
       *  @example https://io.dexscreener.com/u/trading-history/recent/ethereum/0x3b37c733c3fe51ce68c14cb735a6fcc1ff6533ed?t=1667965727001&q=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
       *
       */
      minUsdt: 10000,
      endpoint: 'https://io.dexscreener.com/u/trading-history/recent',
      params: {},
    },
  },
  Pairs: {
    search: {
      endpoint: 'https://api.dexscreener.com/latest/dex/search',
      params: {
        q: '',
      },
    },
  },
  fetch({ params = {}, endpoint }: { endpoint: string; params?: any }): Promise<any> {
    return axios.get(`${endpoint}`, {
      params,
      headers: {},
    });
  },
};
export const DefillamaAPI = {
  Tvl: {
    protocols: {
      list: {
        endpoint: 'https://api.llama.fi/protocols',
      },
      detail: {
        endpoint: 'https://api.llama.fi/protocol',
      },
      tvl: {
        endpoint: 'https://api.llama.fi/tvl',
      },
    },
    charts: {
      list: {
        endpoint: 'https://api.llama.fi/charts',
      },
      chain: {
        endpoint: 'https://api.llama.fi/charts',
      },
    },
    chains: {
      list: {
        endpoint: 'https://api.llama.fi/chains',
      },
    },
  },
  StableCoins: {
    list: {
      endpoint: 'https://stablecoins.llama.fi/stablecoins',
      params: {
        includePrices: true,
      },
    },
  },
  fetch({ params = {}, endpoint }: { endpoint: string; params?: any }): Promise<any> {
    return axios.get(`${endpoint}`, {
      params,
      headers: {},
    });
  },
};
export const DebankAPI = {
  Project: {
    list: {
      endpoint: 'https://api.debank.com/project/v2/list',
    },
    users: {
      endpoint: 'https://api.debank.com/project/portfolios/user_list',
    },
  },
  fetch({ params = {}, endpoint }: { endpoint: string; params?: any }): Promise<any> {
    return axios.get(`${endpoint}`, {
      params,
      headers: {},
    });
  },
};
