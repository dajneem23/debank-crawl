import TelegramBot from 'node-telegram-bot-api';
import { env } from 'process';
import Container, { Token } from 'typedi';

// replace the value below with the Telegram token you receive from @BotFather
export const telegramBotToken = new Token<TelegramBot>('_telegramBot');
export const TelegramLoader = async () => {
  const token = env.TELEGRAM_BOT_TOKEN;
  // Create a bot that uses 'polling' to fetch new updates
  const bot = new TelegramBot(token, { polling: false });
  Container.set(telegramBotToken, bot);
};
export default TelegramLoader;
