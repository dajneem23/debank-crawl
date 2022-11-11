import {
  AssetService,
  AssetTrendingService,
  CategoryService,
  CoinGeckoService,
  DebankService,
  DefillamaService,
  ExchangeService,
} from '@/modules';
const WorkerLoader = () => {
  new DebankService();
  new DefillamaService();
  new CoinGeckoService();
  new AssetService();
  new AssetTrendingService();
  new CategoryService();
  new ExchangeService();
};

export default WorkerLoader;
