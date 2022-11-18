import {
  AssetService,
  AssetTrendingService,
  CategoryService,
  CoinGeckoService,
  DebankService,
  DefillamaService,
  ExchangeService,
  DexScreenerService,
} from '@/modules';
import Container from 'typedi';
import { DIDiscordClient, Discord } from './discordLoader';
const WorkerLoader = () => {
  new DexScreenerService();
  new DebankService();
  new DefillamaService();
  new CoinGeckoService();
  new AssetService();
  new AssetTrendingService();
  new CategoryService();
  new ExchangeService();
  // TODO: TURN ON WHEN READY
  // new DexScreenerService();
};

export default WorkerLoader;
