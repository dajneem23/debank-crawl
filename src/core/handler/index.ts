import { sendTelegramMessage } from '@/service/alert/telegram';
import { DIDiscordClient } from '../../loaders/discord.loader';
import Container from 'typedi';
import { BOT_HEALTH_CHECK_GROUP_ID } from '../../service/alert/telegram/const';

export async function exitHandler(
  options: {
    exit: boolean;
    cleanup: boolean;
  },
  exitCode: number,
) {
  //when app is closing
  if (options.cleanup) {
    process.exit();
  }
  // when app is closing
  if (exitCode || exitCode === 0) {
    try {
      await sendTelegramMessage({
        message: `[cronjob-debank][🔴 Down] exitCode: ${exitCode} `,
        chatId: BOT_HEALTH_CHECK_GROUP_ID,
      });
    } catch (err) {
      console.error(err);
    }
    process.exit();
  }
  // uncaught exception
  if (options.exit) {
    try {
      await sendTelegramMessage({
        message: `[cronjob-debank][🔴 Down] exitCode: ${exitCode} `,
        chatId: BOT_HEALTH_CHECK_GROUP_ID,
      });
    } catch (err) {
      console.error(err);
    }
    process.exit();
  }
}
