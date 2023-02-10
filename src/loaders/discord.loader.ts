import { Db, MongoClient } from 'mongodb';
import { Container, Service, Token } from 'typedi';

import { DILogger } from '@/loaders/logger.loader';
import env from '@/config/env';
import { REST, Routes, GatewayIntentBits, Client, TextChannel, MessagePayload, MessageCreateOptions } from 'discord.js';
import { isJSON } from '@/utils/text';
import { execSync } from 'child_process';
import { table } from 'table';
import { arrayObjectToTable } from '@/utils/table';
import os from 'os';
import { dockerContainerStats, systemInfo } from '@/utils/system';
import { markdownMarkup } from '@/utils/markdown';
export const DIDiscordClient = new Token<Discord>('_discordClient');
export const DIDiscordRest = new Token<REST>('_discordRest');

const commands = [
  {
    name: 'ping',
    description: 'Replies with Pong!',
  },
  {
    name: 'crawler',
    description: 'Crawler commands',
    options: [
      {
        name: 'status',
        description: 'Get crawler status',
        type: 1,
      },
      {
        name: 'dockers_stats',
        description: 'Get dockers stats',
        type: 1,
      },
    ],
  },
];
const TOKEN = env.DISCORD_BOT_TOKEN;
const CLIENT_ID = env.DISCORD_BOT_CLIENT_ID;
const NOTIFICATION_CHANNEL_ID = env.DISCORD_NOTIFICATION_CHANNEL_ID;
@Service(DIDiscordClient)
export class Discord {
  readonly client: Client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
  readonly rest = new REST({ version: '10' }).setToken(TOKEN);
  readonly commands = {
    ping: this.pingCommand,
    crawler: this.crawlerCommand,
  };
  readonly crawlerCommands = {
    dockers_stats: this.dockersStatsCommand,
    status: this.crawlerStatusCommand,
  };
  readonly roles = {
    dev: {
      id: '988646008588234773',
      name: 'dev',
    },
  };
  constructor() {
    // this.rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    // console.log('Successfully reloaded application (/) commands.');

    this.client.on('ready', async () => {
      const channel = this.client.channels.cache.get(NOTIFICATION_CHANNEL_ID) as TextChannel;
      // channel.send('Hello world!');
      Container.set(DIDiscordClient, this);
    });

    this.client.on('interactionCreate', async (interaction: any) => {
      if (!interaction.isChatInputCommand()) return;
      await interaction.reply(':gear: Working on it');
      await this.commands[interaction.commandName as keyof typeof this.commands]?.call(this, { interaction });
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

  async pingCommand({ interaction }: { interaction: any }) {
    return interaction.editReply('Pong!');
  }

  async dockersStatsCommand({ interaction }: { interaction: any }) {
    try {
      const dockerStats = await dockerContainerStats();
      const dockerStatsTable = table(arrayObjectToTable(dockerStats), {
        header: {
          content: 'Docker Stats',
        },
      });

      return interaction.editReply(markdownMarkup(dockerStatsTable));
    } catch (error) {
      await interaction.editReply('Error');
      return;
    }
  }
  crawlerCommand({ interaction }: { interaction: any }) {
    return this.crawlerCommands[interaction.options.getSubcommand() as keyof typeof this.crawlerCommands]?.call(this, {
      interaction,
    });
  }
  async crawlerStatusCommand({ interaction }: { interaction: any }) {
    try {
      //TODO: get crawler status and send it to discord
      //! not done yet
      // const crawlerStatus = execSync('htop').toString();
      const { memLoad, cpuLoad } = await systemInfo();
      const CrawlerStatusTable = table(
        arrayObjectToTable([
          {
            cpuLoad,
            memLoad,
          },
        ]),
        {
          header: {
            content: 'Crawler Status',
          },
        },
      );
      return interaction.editReply(markdownMarkup(CrawlerStatusTable));
    } catch (error) {
      await interaction.editReply('Error');
      return;
    }
  }
}
