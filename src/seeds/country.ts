import mongoDBLoader from '@/loaders/mongoDBLoader';
import { countCollection } from '@/utils/common';
import contries from '../data/contries.json';
/* eslint-disable no-console */
export const CountrySeed = async () => {
  console.log('Running country seed');
  const db = await mongoDBLoader();
  const collection = db.collection('countries');
  const count = await countCollection(collection);
  if (!count) {
    console.log('Inserting countries', contries.length);
    await collection.insertMany(
      contries.map((item) => {
        return {
          name: item.name.common,
          code: item.cca2,
          created_at: new Date(),
          updated_at: new Date(),
        };
      }),
    );
  }
};
