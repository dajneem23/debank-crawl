import { DataFiAPI } from '@/common/api';
import { filter, isNull, omitBy } from 'lodash';
import TelegramBot from 'node-telegram-bot-api';
import { env } from 'process';
import Container from 'typedi';
import { DILogger } from './loggerLoader';
import { pgClientToken } from './pgLoader';

// replace the value below with the Telegram token you receive from @BotFather
const token = env.TELEGRAM_BOT_TOKEN;
const NANSEN_ALERT_GROUP_ID = env.NANSEN_ALERT_GROUP_ID;
const pgClient = Container.get(pgClientToken);
export const TelegramLoader = async () => {
  const logger = Container.get(DILogger);
  // Create a bot that uses 'polling' to fetch new updates
  const bot = new TelegramBot(token, { polling: true });

  bot.on('channel_post', async (msg) => {
    try {
      const { text, chat, entities, date } = msg;
      if (!text) return;
      // console.log(msg);
      const rows = text.split('\n');
      const records = filter(
        rows.map((row) => {
          const [match, sender, quantity, token, usd, receiver] =
            /(.*) sent ([0-9,.]*) (.*) \(\$([0-9,.]*).* to (.*)/g.exec(row) || [];
          const offset = text.indexOf(row);
          const txn = entities.find((entity) => entity.offset === offset);
          let address = null;
          let token_address = null;

          if (txn?.url) {
            const url = new URL(txn.url);
            address = url.searchParams.get('address');
            token_address = url.searchParams.get('token_address');
          }
          const sender_profile = entities.find((entity) => entity.offset === text.indexOf(sender))?.url;
          const receiver_profile = entities.find((entity) => entity.offset === text.indexOf(receiver))?.url;
          return (
            match && {
              sender: sender.trim(),
              sender_profile,
              receiver: receiver?.replace(/(\(.*)\)/g, '').trim(),
              receiver_profile,
              token,
              quantity: +quantity?.replace(/,/g, ''),
              usd: +usd?.replace(/,/g, ''),
              etherscan_url: txn?.url,
              date: new Date(date * 1000),
              address,
              token_address,
            }
          );
        }),
        Boolean,
      );
      if (records.length == 1) {
        // const [, etherscan] = /A new token transfer (\(.*)\)/g.exec(text);
        const offset = text.indexOf('Etherscan');
        const _etherscan_url = entities.find((entity) => entity.offset === offset)?.url;
        if (_etherscan_url) {
          const url = new URL(_etherscan_url);
          (records[0] as any).etherscan_url = _etherscan_url;
          (records[0] as any).address = url.searchParams.get('address');
          (records[0] as any).token_address = url.searchParams.get('token_address');
        }
      }
      records.forEach(
        ({
          sender,
          sender_profile,
          receiver,
          receiver_profile,
          token,
          quantity,
          usd,
          etherscan_url,
          date,
          address,
          token_address,
        }) => {
          pgClient
            .query(
              `INSERT INTO public."bot-nansen-transaction" (sender, sender_profile, receiver, receiver_profile, token, quantity, usd, etherscan_url, date, address, token_address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [
                sender,
                sender_profile,
                receiver,
                receiver_profile,
                token,
                quantity,
                usd,
                etherscan_url,
                date,
                address,
                token_address,
              ],
            )
            .catch((e) => {
              logger.error('db_error', e);
            });
        },
      );
      // logger.info('info', 'TelegramLoader', records);
    } catch (error) {
      logger.error('error', error);
    }
  });
};
export default TelegramLoader;
