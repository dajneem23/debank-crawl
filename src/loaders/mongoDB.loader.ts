import { Db, MongoClient } from 'mongodb';
import { Container, Token } from 'typedi';

import { DILogger } from './logger.loader';

export const DIMongoDB = new Token<Db>('mongoDB');
export const DIMongoClient = new Token<MongoClient>('mongoClient');

const mongoDBLoader = async (): Promise<Db> => {
  const logger = Container.get(DILogger);

  const client = await MongoClient.connect(process.env.MONGO_URI);
  client.on('disconnected', () => logger.warn('disconnected', 'MongoDB'));
  client.on('reconnected', () => logger.success('reconnected', 'MongoDB'));
  const db = client.db();
  Container.set(DIMongoClient, client);
  Container.set(DIMongoDB, db);
  logger.success('connected', 'MongoDB');

  return db;
};

export default mongoDBLoader;
