import Container, { Token } from 'typedi';
import { DIMongoClient } from './mongoDB.loader';

export default async () => {
  await Promise.all([loadOnchainBotAlertConfig()]);
};

export const onChainBotAlertConfigToken = new Token<{
  id: string;
  min_usd_value: number;
  chat_id: string;
}>('onchain-alert-telegram-chat-id');
const loadOnchainBotAlertConfig = async () => {
  const mgClient = Container.get(DIMongoClient);
  const db = mgClient.db('onchain-bot');
  const [config] = await db
    .collection('onchain-bot-alert')
    .find({
      id: 'telegram-bot-alert-transaction',
    })
    .toArray();
  Container.set('onchain-alert-telegram-chat-id', config);
};
