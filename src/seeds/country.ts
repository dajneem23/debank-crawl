import mongoDBLoader from '@/loaders/mongoDBLoader';
import { $toObjectId, $countCollection } from '@/utils/mongoDB';
import contries from '../data/contries.json';
/* eslint-disable no-console */
export const CountrySeed = async () => {
  console.log('Running country seed');
  const db = await mongoDBLoader();
  const collection = db.collection('countries');
  const count = await $countCollection({ collection });
  if (!count) {
    console.log('Inserting countries', contries.length);
    await collection.insertMany(
      contries.map((item) => {
        return {
          name: item.name.common,
          code: item.cca2,
          deleted: false,
          created_at: new Date(),
          created_by: 'admin',
          updated_at: new Date(),
        };
      }),
    );
  }
};
