import { Db, MongoClient } from 'mongodb';
import { Container, Service, Token } from 'typedi';

import { DILogger } from '@/loaders/logger.loader';
import env from '@/config/env';
import { REST, Routes, GatewayIntentBits, Client, TextChannel, MessagePayload, MessageCreateOptions } from 'discord.js';
import { isJSON } from '@/utils/text';

export const DIDiscordClient = new Token<Discord>('_discordClient');
export const DIDiscordRest = new Token<REST>('_discordRest');
const commands = [
  {
    name: 'ping',
    description: 'Replies with Pong!',
  },
];
const TOKEN = env.DISCORD_BOT_TOKEN;
const CLIENT_ID = env.DISCORD_BOT_CLIENT_ID;
const NOTIFICATION_CHANNEL_ID = env.DISCORD_NOTIFICATION_CHANNEL_ID;
@Service(DIDiscordClient)
export class Discord {
  readonly client: Client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
  readonly rest = new REST({ version: '10' }).setToken(TOKEN);
  constructor() {
    // await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    // console.log('Successfully reloaded application (/) commands.');

    this.client.on('ready', async () => {
      const channel = this.client.channels.cache.get(NOTIFICATION_CHANNEL_ID) as TextChannel;
      channel.send('Hello world!');
      Container.set(DIDiscordClient, this);
    });
    this.client.on('interactionCreate', async (interaction: any) => {
      if (!interaction.isChatInputCommand()) return;

      if (interaction.commandName === 'ping') {
        await interaction.reply('Pong!');
      }
    });
    this.client.login(TOKEN);
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
  decorateMsg(msg: string) {
    return isJSON(msg) ? `\`\`\`json\n${msg}\`\`\`` : msg;
  }
}
