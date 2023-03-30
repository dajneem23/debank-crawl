import { Container, Service, Token } from 'typedi';

import { REST, GatewayIntentBits, Client, TextChannel, MessagePayload, MessageCreateOptions } from 'discord.js';
import { DILogger } from './logger.loader';
import { isJSON } from '../utils/text';
export const DIDiscordClient = new Token<Discord>('_discordClient');
export const DIDiscordRest = new Token<REST>('_discordRest');

const NOTIFICATION_CHANNEL_ID = '1041620555188682793';
const ERROR_CHANNEL_ID = '1072390465246212096';
@Service(DIDiscordClient)
export class Discord {
  readonly client: Client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
  readonly rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

  readonly roles = {
    dev: {
      id: '988646008588234773',
      name: 'dev',
    },
  };
  readonly notifyChannelId = NOTIFICATION_CHANNEL_ID;

  readonly errorChannelId = ERROR_CHANNEL_ID;

  async init() {
    this.client.on('ready', async () => {
      const channel = this.client.channels.cache.get(NOTIFICATION_CHANNEL_ID) as TextChannel;
      channel.send('Hello world! i am ready! :robot:');
    });

    await this.client.login(process.env.DISCORD_BOT_TOKEN);
    Container.set(DIDiscordClient, this);
  }

  async sendMsg({
    message,
    channelId = NOTIFICATION_CHANNEL_ID,
  }: {
    message: string | MessagePayload | MessageCreateOptions;
    channelId?: string;
  }): Promise<void> {
    try {
      const channel = this.client.channels.cache.get(channelId) as TextChannel;
      await channel.send(message);
    } catch (error) {
      const logger = Container.get(DILogger);
      logger.error('error', 'discord', 'sendMsg', error, message);
    }
  }
}
