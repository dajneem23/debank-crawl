import mongoDBLoader from '@/loaders/mongoDBLoader';
import { countCollection } from '@/utils/common';
import crypto_project from '../data/crypto_slate/json/crypto_project.json';
import token_sector from '../data/crypto_slate/json/token_sector.json';
import token_wallet from '../data/crypto_slate/json/token_wallet.json';
import token_team from '../data/crypto_slate/json/token_team.json';
import token_exchange from '../data/crypto_slate/json/token_exchange.json';
import { $toObjectId } from '@/utils/mongoDB';

export const CoinSeed = async () => {
  /* eslint-disable no-console */

  const db = await mongoDBLoader();
  const collection = db.collection('coins');
  const count = await countCollection(collection);
  const sectors = await db.collection('sectors').find({}).toArray();
  if (!count) {
    const coins = [];
    coins.push(
      ...(crypto_project as []).map((_coin) => {
        const {
          name,
          token_id,
          unique_key,
          consensus,
          blockchain,
          open_source,
          hash_algorithm,
          org_structure,
          hardware_wallet,
          development_status,
          explorer,
          white_paper,
          website,
          avatar,
          blog,
          medium,
          reddit,
          twitter,
          youtube,
          facebook,
          linkedin,
          telegram,
          instagram,
          about,
        } = _coin;
        return {
          name,
          avatar,
          blog,
          medium,
          reddit,
          twitter,
          youtube,
          facebook,
          linkedin,
          telegram,
          instagram,
          about,
          token_id,
          unique_key,
          consensus,
          blockchain,
          open_source: open_source === 'Yes',
          hash_algorithm: hash_algorithm == 'None' ? null : hash_algorithm,
          org_structure,
          hardware_wallet: hardware_wallet == 'Yes',
          development_status,
          explorer,
          white_paper,
          website,
          sectors: $toObjectId(
            token_sector
              .filter((company) => company.token_name == name)
              .map((sector) => {
                return sectors.find((_sector) => {
                  return _sector.title == sector.sector;
                })?._id;
              }),
          ),
          wallets: token_wallet
            .filter((wallet) => wallet.token_name == name)
            .map((coin) => {
              return {
                coin: coin.wallet,
              };
            }),
          token_exchanges: token_exchange
            .filter((exchange) => exchange.token_name == name)
            .map((coin) => {
              return {
                coin: coin.exchange,
              };
            }),
          teams: token_team
            .filter((team) => team.token_name == name)
            .map((team) => {
              return team.team;
            }),
          created_at: new Date(),
          updated_at: new Date(),
        };
      }),
    );
    // console.log(coins.find((coin) => coin.wallets.length > 1));

    console.log('Inserting coins', coins.length);
    await collection.insertMany(coins);
  }
};
