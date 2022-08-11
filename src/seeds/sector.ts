import company_sector from '../data/crypto_slate/json/company_sector.json';
import token_sector from '../data/crypto_slate/json/token_sector.json';
import mongoDBLoader from '@/loaders/mongoDBLoader';
import { countCollection } from '@/utils/common';
export const SectorSeed = async () => {
  /* eslint-disable no-console */
  console.log('Running sector seed');
  const db = await mongoDBLoader();
  const collection = db.collection('sectors');
  const count = await countCollection(collection);
  if (!count) {
    const sectors = [];
    sectors.push(
      ...company_sector.map((item) => {
        return {
          title: item.sector,
          weight: Math.floor(Math.random() * 100),
          created_at: new Date(),
          updated_at: new Date(),
        };
      }),
      ...token_sector.map((item) => {
        return {
          title: item.sector,
          weight: Math.floor(Math.random() * 100),
          created_at: new Date(),
          updated_at: new Date(),
        };
      }),
    );
    const uniqueSectors = sectors.filter((item, index, self) => {
      return (
        self.findIndex((t) => {
          return t.title === item.title;
        }) === index
      );
    });

    console.log('Inserting sectors', uniqueSectors.length);
    await collection.insertMany(uniqueSectors);
  }
};
