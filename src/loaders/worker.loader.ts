import Container from 'typedi';
import { DIDiscordClient, Discord } from './discord.loader';
import { NansenService } from '../modules/nansen/nansen.service';
import { EtherScanService } from '../modules/etherscan/ethersan.service';
import { PairBookService } from '../modules/pair-book/pair-book.service';
import { OnChainPriceService } from '../modules/onchain-price/onchain-price.service';
import { InitTokenQueue } from '../service/token/queue';
import { DefillamaService } from '../modules/defillama';
import { CoinGeckoService } from '../modules/coingecko';
const WorkerLoader = () => {
  try {
    // new DexScreenerService();
    // new DebankService();
    new DefillamaService();
    new CoinGeckoService();
    // new PairBookService();
    // new EtherScanService();
    // new WatchersProService();
    // new AssetService();
    new OnChainPriceService();

    // new NansenService();

    // InitTokenQueue();
    // new AssetTrendingService();
    // new CategoryService();
    // new ExchangeService();
    // TODO: TURN ON WHEN READY
    // new DexScreenerService();
  } catch (error) {
    console.error(error);
  }
};

export default WorkerLoader;
