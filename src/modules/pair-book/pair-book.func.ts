import { DIMongoClient } from '@/loaders/mongoDB.loader';
import { Filter, Document } from 'mongodb';
import Container from 'typedi';

export const findPairsOfSymbol = (filter: Filter<Document>) => {
  const mgClient = Container.get(DIMongoClient);
  return mgClient.db('onchain').collection('pair-book').find(filter).toArray();
};
