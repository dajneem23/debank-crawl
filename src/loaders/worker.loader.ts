import Container from 'typedi';
import { DIDiscordClient, Discord } from './discord.loader';
import { OnChainPriceService } from '../modules/onchain-price/onchain-price.service';
import { InitTokenQueue } from '../service/token/queue';
import { DefillamaService } from '../modules/defillama';
import { CoinGeckoService } from '../modules/coingecko';
const WorkerLoader = () => {
  new DefillamaService();
  new CoinGeckoService();
  new OnChainPriceService();
};

export default WorkerLoader;
