import { env } from 'process';
import axios, { AxiosRequestConfig } from 'axios';
import { WEBSHARE_PROXY_HTTP } from './proxy';
import { getDebankAPISign } from '@/modules/debank/debank.fnc';
import { randomUserAgent } from '@/config/userAgent';

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
    INTERVAL: env.MARKETCAP_FETCH_SCHEDULE || '* 0 0 * * *',
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
    history: {
      endpoint: 'https://api.coingecko.com/api/v3/coins/:id/history',
      params: {
        date: '30-12-2017',
      },
    },
    market_chart_range: {
      endpoint: 'https://api.coingecko.com/api/v3/coins/:id/market_chart/range',
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
      proxy: {
        host: WEBSHARE_PROXY_HTTP.host,
        port: WEBSHARE_PROXY_HTTP.port,
        auth: { username: WEBSHARE_PROXY_HTTP.auth.username, password: WEBSHARE_PROXY_HTTP.auth.password },
        protocol: WEBSHARE_PROXY_HTTP.protocol,
      },
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
      proxy: {
        host: WEBSHARE_PROXY_HTTP.host,
        port: WEBSHARE_PROXY_HTTP.port,
        auth: { username: WEBSHARE_PROXY_HTTP.auth.username, password: WEBSHARE_PROXY_HTTP.auth.password },
        protocol: WEBSHARE_PROXY_HTTP.protocol,
      },
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
  /**
   *  @docs https://defillama.com/docs/api
   */
  BatchHistorical: {
    endpoint: 'https://coins.llama.fi/batchHistorical',
    params: {
      //example:{"avax:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e": [1666876743, 1666862343],"coingecko:ethereum": [1666869543, 1666862343]}
      coins: '',
    },
  },
  Coins: {
    //example:  https://coins.llama.fi/prices/historical/1672531247/ethereum:0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE?searchWidth=4h
    historical: {
      endpoint: 'https://coins.llama.fi/prices/historical/:timestamp/:coins',
      params: {
        searchWidth: '4h',
      },
    },
    current: {
      endpoint: 'https://coins.llama.fi/prices/current/:coins',
    },
  },
  fetch({ params = {}, endpoint }: { endpoint: string; params?: any }): Promise<any> {
    return axios.get(`${endpoint}`, {
      params,
      proxy: {
        host: WEBSHARE_PROXY_HTTP.host,
        port: WEBSHARE_PROXY_HTTP.port,
        auth: { username: WEBSHARE_PROXY_HTTP.auth.username, password: WEBSHARE_PROXY_HTTP.auth.password },
        protocol: WEBSHARE_PROXY_HTTP.protocol,
      },
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
  Protocols: {
    list: {
      endpoint: 'https://api.debank.com/protocol/list',
      params: {
        start: 0,
        limit: 10000,
        chain_id: '',
        pool_name: '',
        order_by: '-deposit_usd_value',
      },
    },
    pool: {
      endpoint: 'https://api.debank.com/protocol/pools',
      params: {
        start: 0,
        limit: 100,
        //! protocol_id
        id: '',
      },
    },
  },
  Token: {
    /**
     * @description fetch token list from debank
     * @requires user_addr: string
     */
    balanceList: {
      endpoint: 'https://api.debank.com/token/balance_list',
    },
    /**
     * @description fetch token list from debank
     * @requires user_addr: string
     */
    cacheBalanceList: {
      endpoint: 'https://api.debank.com/token/cache_balance_list',
    },
  },
  Social: {
    /**
     * @description fetch social list from debank
     * @requires page_num: number,page_count: number
     * @example { params: { page_num: 1, page_count: 100 } }
     */
    socialRanking: {
      endpoint: 'https://api.debank.com/social_ranking/list',
      params: {
        page_num: 1,
        page_count: 50,
      },
    },
  },
  Portfolio: {
    /**
     * @description fetch portfolio list from debank
     * @requires user_addr: string
     * @example https://api.debank.com/portfolio/project_list?user_addr=0x3b37c733c3fe51ce68c14cb735a6fcc1ff6533ed
     */
    projectList: {
      endpoint: 'https://api.debank.com/portfolio/project_list',
    },
  },
  Asset: {
    /**
     * @description fetch asset list from debank
     * @requires user_addr: string
     * @example https://api.debank.com/asset/classify?user_addr=0x3b37c733c3fe51ce68c14cb735a6fcc1ff6533ed
     */
    classify: {
      endpoint: 'https://api.debank.com/asset/classify',
    },
  },
  Whale: {
    /*
     * @description fetch whale list from debank
     * @requires start: number,limit: number,order_by: string
     * @example https://api.debank.com/whale/list?start=0&limit=100&order_by=usd_value
     */
    list: {
      endpoint: 'https://api.debank.com/whale/list',
      params: {
        start: 0,
        limit: 100,
        order_by: 'usd_value',
      },
    },
  },
  Coin: {
    /**
     * @description fetch coin list from debank
     * @example https://api.debank.com/coin/list
     */
    list: {
      endpoint: 'https://api.debank.com/coin/list',
    },
    top_holders: {
      endpoint: 'https://api.debank.com/coin/top_holders',
      params: {
        // coin id from list
        id: '', //just for example
        start: 0,
        limit: 100,
      },
    },
  },
  User: {
    addr: {
      endpoint: 'https://api.debank.com/user/addr',
      params: {
        // user address
        addr: '', //just for example
      },
    },
  },
  async fetch({
    params = {},
    endpoint,
    config = {},
  }: {
    endpoint: string;
    params?: any;
    config?: AxiosRequestConfig;
  }): Promise<any> {
    const { api_nonce, api_sign, api_ts, api_ver } = await getDebankAPISign();

    return axios.get(`${endpoint}`, {
      params,
      proxy: {
        host: WEBSHARE_PROXY_HTTP.host,
        port: WEBSHARE_PROXY_HTTP.port,
        auth: { username: WEBSHARE_PROXY_HTTP.auth.username, password: WEBSHARE_PROXY_HTTP.auth.password },
        protocol: WEBSHARE_PROXY_HTTP.protocol,
        ...(config.proxy
          ? {
              ...config.proxy,
            }
          : {}),
      },
      headers: {
        'x-api-nonce': api_nonce,
        'x-api-sign': api_sign,
        'x-api-ts': api_ts,
        'x-api-ver': api_ver,
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-language': 'en-US,en;q=0.9,vi;q=0.8',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        'sec-ch-ua': '"Chromium";v="110", "Not A(Brand";v="24", "Microsoft Edge";v="110"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        // 'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        referer: 'https://debank.com/',
        origin: 'https://debank.com',
        'User-Agent': randomUserAgent(),
        ...(config.headers
          ? {
              ...config.headers,
            }
          : {}),
      },
    });
  },
};
