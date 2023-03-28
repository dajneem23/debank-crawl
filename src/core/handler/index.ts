import { DIDiscordClient } from '../../loaders/discord.loader';
import { TextChannel } from 'discord.js';
import Container from 'typedi';

export async function exitHandler(
  options: {
    exit: boolean;
    cleanup: boolean;
  },
  exitCode: number,
) {
  const discordBot = Container.get(DIDiscordClient);
  //when app is closing
  if (options.cleanup) {
    process.exit();
  }
  // when app is closing
  if (exitCode || exitCode === 0) {
    try {
      const channel = discordBot.client.channels.cache.get('1072390401392115804') as TextChannel;
      // console.log(channel.us)
      await channel.send(`📛 Crawler is down!!! <@&${discordBot.roles.dev.id}>`);
    } catch (err) {
      console.error(err);
    }
    process.exit();
  }
  // uncaught exception
  if (options.exit) {
    try {
      const channel = discordBot.client.channels.cache.get('1072390401392115804') as TextChannel;
      await channel.send(`📛 Crawler is crash !!! <@&${discordBot.roles.dev.id}>`);
    } catch (err) {
      console.error(err);
    }
    process.exit();
  }
}
