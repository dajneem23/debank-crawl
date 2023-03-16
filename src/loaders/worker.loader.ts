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
import { DIDiscordClient, Discord } from './discord.loader';
import { BinanceService } from '@/modules/binance/binance.service';
import { NansenService } from '@/modules/nansen/nansen.service';
import { WatchersProService } from '@/modules/watchers-pro/watchers-pro.service';
import { EtherScanService } from '@/modules/etherscan/ethersan.service';
const WorkerLoader = () => {
  // new DexScreenerService();
  new DebankService();
  new BinanceService();
  new DefillamaService();
  new CoinGeckoService();

  // new EtherScanService();
  // new WatchersProService();
  // new AssetService();

  new NansenService();
  // new AssetTrendingService();
  // new CategoryService();
  // new ExchangeService();
  // TODO: TURN ON WHEN READY
  // new DexScreenerService();
};

export default WorkerLoader;
