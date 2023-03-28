import { generateId } from '../utils/common';
import { filter } from 'lodash';
import TelegramBot from 'node-telegram-bot-api';
import { env } from 'process';
import Container, { Token } from 'typedi';

// replace the value below with the Telegram token you receive from @BotFather
const token = env.TELEGRAM_BOT_TOKEN;
export const telegramBotToken = new Token<TelegramBot>('_telegramBot');
export const TelegramLoader = async () => {
  // Create a bot that uses 'polling' to fetch new updates
  const bot = new TelegramBot(token, { polling: false });
  Container.set(telegramBotToken, bot);
};
export default TelegramLoader;
