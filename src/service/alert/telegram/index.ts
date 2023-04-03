import { telegramBotToken } from '../../../loaders/telegram.loader';
import TelegramBot from 'node-telegram-bot-api';
import Container from 'typedi';

export const sendTelegramMessage = async ({
  message,
  chatId = '-815217228',
  options,
}: {
  message: string;
  chatId?: string;
  options?: TelegramBot.SendMessageOptions;
}) => {
  const bot = Container.get(telegramBotToken);
  await bot.sendMessage(chatId, message, options);
};
