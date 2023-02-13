import { Db, MongoClient } from 'mongodb';
import { Container, Service, Token } from 'typedi';

import { DILogger } from '@/loaders/logger.loader';
import env from '@/config/env';
import {
  REST,
  Routes,
  GatewayIntentBits,
  Client,
  TextChannel,
  MessagePayload,
  MessageCreateOptions,
  SlashCommandBuilder,
} from 'discord.js';
import { isJSON } from '@/utils/text';
import { execSync } from 'child_process';
import { table } from 'table';
import { arrayObjectToTable } from '@/utils/table';
import os from 'os';
import { dockerContainerStats, systemInfo } from '@/utils/system';
import { markdownMarkup } from '@/utils/markdown';
import { debankServiceToken } from '@/modules';
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
      {
        name: 'queue_debank',
        description: 'Get crawler queue debank',
        type: 1,
      },
    ],
  },
];

const TOKEN = env.DISCORD_BOT_TOKEN;
const CLIENT_ID = env.DISCORD_BOT_CLIENT_ID;
const NOTIFICATION_CHANNEL_ID = '1041620555188682793';
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
    queue_debank: this.crawlerQueueCommand,
  };
  readonly roles = {
    dev: {
      id: '988646008588234773',
      name: 'dev',
    },
  };

  // constructor() {}

  async init() {
    // ? enable this if you want to reload commands
    // await this.initCommands();

    this.client.on('ready', async () => {
      const channel = this.client.channels.cache.get(NOTIFICATION_CHANNEL_ID) as TextChannel;
      channel.send('Hello world! i am ready! :robot:');
    });

    this.client.on('interactionCreate', async (interaction: any) => {
      if (!interaction.isChatInputCommand()) return;
      await interaction.reply(':gear: Working on it');
      await this.commands[interaction.commandName as keyof typeof this.commands]?.call(this, { interaction });
    });
    await this.client.login(TOKEN);
    Container.set(DIDiscordClient, this);
  }

  async initCommands() {
    await this.rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.info('Successfully reloaded application (/) commands.');
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
        columns: [
          {
            width: 20,
          },
          {
            width: 10,
          },
          {
            width: 5,
          },
          {
            width: 5,
          },
          {
            width: 5,
          },
        ],
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

  async crawlerQueueCommand({ interaction }: { interaction: any }) {
    try {
      // console.info({ interaction });
      const debankService = Container.get(debankServiceToken);
      const messageTable = table(
        arrayObjectToTable([
          {
            name: 'debank',
            ...(await debankService.getCountOfJob('debank')),
          },
          {
            name: 'top holder',
            ...(await debankService.getCountOfJob('debankTopHolder')),
          },
          {
            name: 'ranking',
            ...(await debankService.getCountOfJob('debankRanking')),
          },
          {
            name: 'whale',
            ...(await debankService.getCountOfJob('debankWhale')),
          },
        ]),
        {
          header: {
            content: 'Crawler queue debank',
          },
          columns: [
            {
              width: 10,
            },
            {
              width: 5,
            },
            {
              width: 7,
            },
            {
              width: 7,
            },
            {
              width: 6,
            },
            {
              width: 9,
            },
            {
              width: 6,
            },
            {
              width: 6,
            },
          ],
        },
      );
      return interaction.editReply(markdownMarkup(messageTable));
    } catch (error) {
      await interaction.editReply('Error');
      return;
    }
  }
}
