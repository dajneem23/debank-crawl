import { generateId } from '@/utils/common';
import { filter } from 'lodash';
import TelegramBot from 'node-telegram-bot-api';
import { env } from 'process';
import Container from 'typedi';
import { DILogger } from './logger.loader';
import { pgPoolToken } from './pg.loader';

// replace the value below with the Telegram token you receive from @BotFather
const token = env.TELEGRAM_BOT_TOKEN;
const pgClient = Container.get(pgPoolToken);
export const TelegramLoader = async () => {
  // Create a bot that uses 'polling' to fetch new updates
  const bot = new TelegramBot(token, { polling: true });
  const scanRegex = /Etherscan|PolygonScan|BscScan|FtmScan|arbiscan/gi;

  bot.on('channel_post', async (msg) => {
    try {
      const { text, entities = [], date } = msg;
      let message = text;
      if (!text) return;
      const rows = text.split('\n');
      const [_, alert_name] = /(.*):/g.exec(text);

      const records = filter(
        rows.map((row) => {
          const [match, sender, quantity, token, usd, receiver] =
            /(.*) sent (.*) (.*) \(\$(.*)\).* to (.*)/g.exec(row) || [];
          const _match = text.match(scanRegex);
          const offset = _match?.[0] ? message.indexOf(_match[0]) : -1;
          const txn = entities.find((entity) => entity.offset === offset);
          let address = null;
          let token_address = null;

          if (txn?.url) {
            const url = new URL(txn.url);
            address = url.searchParams.get('address');
            token_address = url.searchParams.get('token_address');
          }
          const sender_profile = entities.find((entity) => entity.offset === message.indexOf(sender))?.url;
          const receiver_profile = entities.find((entity) => entity.offset === message.indexOf(receiver))?.url;
          if (match) message = message.replace(row, generateId(row.length));
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
              date: new Date(date * 1000).toISOString(),
              address,
              token_address,
              alert_name: alert_name.trim(),
            }
          );
        }),
        Boolean,
      );
      if (records.length == 1) {
        // const [, etherscan] = /A new token transfer (\(.*)\)/g.exec(text);
        const _match = text.match(scanRegex);
        if (!_match) {
          console.info({
            records,
            text,
          });
        }
        const offset = text.indexOf(_match[0]);
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
          alert_name,
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
        }: any) => {
          pgClient
            .query(
              `INSERT INTO public."bot-nansen-transaction" (alert_name, sender, sender_profile, receiver, receiver_profile, token, quantity, usd, etherscan_url, date, address, token_address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
              [
                alert_name,
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
              const logger = Container.get(DILogger);
              logger.error('error', 'insert:bot-nansen-transaction', JSON.stringify(e));
            });
        },
      );
      // logger.info('info', 'TelegramLoader', records);
    } catch (error) {
      const logger = Container.get(DILogger);
      logger.discord('error', 'TelegramLoader', JSON.stringify(error));
    }
  });
};
export default TelegramLoader;
