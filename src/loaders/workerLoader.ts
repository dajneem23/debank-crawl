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
import { BinanceService } from '@/modules/binance/binance.service';
const WorkerLoader = () => {
  // new DexScreenerService();
  new DebankService();
  new BinanceService();
  // new DefillamaService();
  // new CoinGeckoService();
  // new AssetService();
  // new AssetTrendingService();
  // new CategoryService();
  // new ExchangeService();
  // TODO: TURN ON WHEN READY
  // new DexScreenerService();
};

export default WorkerLoader;
