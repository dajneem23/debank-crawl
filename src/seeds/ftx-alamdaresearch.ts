import fs from 'fs';
import { createDataFile, readDataFromFile } from './utils';
import Container from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDB.loader';
import sourceData from '../data/backup/FTX - Alameda Research.json';
export const _mapFTX_ALAMEDA = async () => {
  const db = Container.get(DIMongoDB);
  const collection = db.collection('cryptorank-coins');

  const result = await Promise.all(
    sourceData.map(async ({ Fundraising_Round, Round, Entity, Amount, Date }) => {
      const [cryptorank_coin] = await collection
        .aggregate([
          {
            $match: {
              name: {
                $regex: new RegExp(`^${Fundraising_Round}$`, 'i'),
                // $options: 'i',
              },
            },
          },
        ])
        .toArray();
      return {
        projectName: Fundraising_Round,
        Round,
        Entity,
        Amount,
        Date,
        ...(cryptorank_coin && {
          symbol: cryptorank_coin.symbol,
          // fundingRounds: cryptorank_coin.fundingRounds,
          '7dPrice': cryptorank_coin?.histPrices?.['7D']?.USD || null,
          '30dPrice': cryptorank_coin?.histPrices?.['30D']?.USD || null,
          '24hPrice': cryptorank_coin?.histPrices?.['24H']?.USD || null,
        }),
      };
    }),
  );
  fs.writeFileSync(`${__dirname}/data/_ftx-alameda.json`, JSON.stringify(result));
};
