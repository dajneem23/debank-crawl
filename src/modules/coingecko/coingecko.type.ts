export interface CoinGeckoAsset {
  id: string;
  symbol: string;
  name: string;
  platforms: {
    [key: string]: any;
  };
  details: CoinGeckoAssetDetail;
}
export interface CoinGeckoAssetDetail {
  id: ID;
  symbol: string;
  name: string;
  asset_platform_id: any;
  platforms: Platforms;
  detail_platforms: DetailPlatforms;
  block_time_in_minutes: number;
  hashing_algorithm: string;
  categories: string[];
  public_notice: any;
  additional_notices: any[];
  localization: { [key: string]: string };
  description: { [key: string]: string };
  links: Links;
  image: Image;
  country_origin: string;
  genesis_date: string;
  sentiment_votes_up_percentage: number;
  sentiment_votes_down_percentage: number;
  market_cap_rank: number;
  coingecko_rank: number;
  coingecko_score: number;
  developer_score: number;
  community_score: number;
  liquidity_score: number;
  public_interest_score: number;
  market_data: MarketData;
  community_data: CommunityData;
  developer_data: {
    forks: number;
    stars: number;
    subscribers: number;
    total_issues: number;
    closed_issues: number;
    pull_requests_merged: number;
    pull_request_contributors: number;
    code_additions_deletions_4_weeks: CodeAdditionsDeletions4_Weeks;
    commit_count_4_weeks: number;
    last_4_weeks_commit_activity_series: number[];
  };
  public_interest_stats: PublicInterestStats;
  status_updates: any[];
  last_updated: string;
  tickers: Ticker[];
}

export interface CommunityData {
  facebook_likes: any;
  twitter_followers: number;
  reddit_average_posts_48h: number;
  reddit_average_comments_48h: number;
  reddit_subscribers: number;
  reddit_accounts_active_48h: number;
  telegram_channel_user_count: any;
}

export interface DetailPlatforms {
  '': {
    decimal_place: any;
    contract_address: string;
  };
}

export interface CodeAdditionsDeletions4_Weeks {
  additions: number;
  deletions: number;
}

export enum ID {
  Binancecoin = 'binancecoin',
  Bitcoin = 'bitcoin',
  Chainlink = 'chainlink',
  Dash = 'dash',
  Ethereum = 'ethereum',
  Polkadot = 'polkadot',
  Ripple = 'ripple',
  Tezos = 'tezos',
  WrappedBitcoin = 'wrapped-bitcoin',
}

export interface Image {
  thumb: string;
  small: string;
  large: string;
}

export interface Links {
  homepage: string[];
  blockchain_site: string[];
  official_forum_url: string[];
  chat_url: string[];
  announcement_url: string[];
  twitter_screen_name: ID;
  facebook_username: string;
  bitcointalk_thread_identifier: any;
  telegram_channel_identifier: string;
  subreddit_url: string;
  repos_url: ReposURL;
}

export interface ReposURL {
  github: string[];
  bitbucket: any[];
}

export interface MarketData {
  current_price: { [key: string]: number };
  total_value_locked: any;
  mcap_to_tvl_ratio: any;
  fdv_to_tvl_ratio: any;
  roi: any;
  ath: { [key: string]: number };
  ath_change_percentage: { [key: string]: number };
  ath_date: { [key: string]: string };
  atl: { [key: string]: number };
  atl_change_percentage: { [key: string]: number };
  atl_date: { [key: string]: string };
  market_cap: { [key: string]: number };
  market_cap_rank: number;
  fully_diluted_valuation: { [key: string]: number };
  total_volume: { [key: string]: number };
  high_24h: { [key: string]: number };
  low_24h: { [key: string]: number };
  price_change_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d: number;
  price_change_percentage_14d: number;
  price_change_percentage_30d: number;
  price_change_percentage_60d: number;
  price_change_percentage_200d: number;
  price_change_percentage_1y: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  price_change_24h_in_currency: { [key: string]: number };
  price_change_percentage_1h_in_currency: { [key: string]: number };
  price_change_percentage_24h_in_currency: { [key: string]: number };
  price_change_percentage_7d_in_currency: { [key: string]: number };
  price_change_percentage_14d_in_currency: { [key: string]: number };
  price_change_percentage_30d_in_currency: { [key: string]: number };
  price_change_percentage_60d_in_currency: { [key: string]: number };
  price_change_percentage_200d_in_currency: { [key: string]: number };
  price_change_percentage_1y_in_currency: { [key: string]: number };
  market_cap_change_24h_in_currency: { [key: string]: number };
  market_cap_change_percentage_24h_in_currency: { [key: string]: number };
  total_supply: number;
  max_supply: number;
  circulating_supply: number;
  sparkline_7d: {
    price: number[];
  };
  last_updated: string;
}

export interface Platforms {
  '': string;
}

export interface PublicInterestStats {
  alexa_rank: number;
  bing_matches: any;
}

export interface Ticker {
  base: string;
  target: string;
  market: Market;
  last: number;
  volume: number;
  converted_last: { [key: string]: number };
  converted_volume: { [key: string]: number };
  trust_score: TrustScore;
  bid_ask_spread_percentage: number;
  timestamp: string;
  last_traded_at: string;
  last_fetch_at: string;
  is_anomaly: boolean;
  is_stale: boolean;
  trade_url: any | string;
  token_info_url: any;
  coin_id: ID;
  target_coin_id?: TargetCoinID;
}

export interface Market {
  name: string;
  identifier: string;
  has_trading_incentive: boolean;
}

export enum TargetCoinID {
  Ripple = 'ripple',
  UsdCoin = 'usd-coin',
  BinanceUsd = 'binance-usd',
  Binanceidr = 'binanceidr',
  Bitcoin = 'bitcoin',
  Dai = 'dai',
  RupiahToken = 'rupiah-token',
  Tether = 'tether',
}

export interface CoinGeckoCategories {
  id: string;
  name: string;
  market_cap: number;
  market_cap_change_24h: number;
  content: null | string;
  top_3_coins: string[];
  volume_24h: number;
  updated_at: string;
}

export interface CoinGeckoBlockchain {
  id: string;
  chain_identifier: number | null;
  name: string;
  shortname: string;
}

export interface CoinGeckoExchange {
  name: Name;
  year_established: number;
  country: string;
  description: string;
  url: string;
  image: string;
  facebook_url: string;
  reddit_url: string;
  telegram_url: string;
  slack_url: string;
  other_url_1: string;
  other_url_2: string;
  twitter_handle: TwitterHandle;
  has_trading_incentive: boolean;
  centralized: boolean;
  public_notice: string;
  alert_notice: string;
  trust_score: number;
  trust_score_rank: number;
  trade_volume_24h_btc: number;
  trade_volume_24h_btc_normalized: number;
  tickers: Ticker[];
  status_updates: StatusUpdate[];
}

export enum Name {
  Binance = 'Binance',
}

export interface StatusUpdate {
  description: string;
  category: string;
  created_at: string;
  user: string;
  user_title: string;
  pin: boolean;
  project: Project;
}

export interface Project {
  type: string;
  id: TwitterHandle;
  name: Name;
  image: Image;
}

export enum TwitterHandle {
  Binance = 'binance',
}

export interface Image {
  thumb: string;
  small: string;
  large: string;
}

export enum TrustScore {
  Green = 'green',
}

export interface CoinGeckoCryptoCurrencyGlobal {
  active_cryptocurrencies: number;
  upcoming_icos: number;
  ongoing_icos: number;
  ended_icos: number;
  markets: number;
  total_market_cap: { [key: string]: number };
  total_volume: { [key: string]: number };
  market_cap_percentage: { [key: string]: number };
  market_cap_change_percentage_24h_usd: number;
  updated_at: number;
}
