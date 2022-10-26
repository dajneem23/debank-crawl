import mongoDBLoader from '@/loaders/mongoDBLoader';
import { $countCollection } from '@/utils/mongoDB';
import contries from '../data/contries.json';
import Container, { Inject, Service } from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDBLoader';
/* eslint-disable no-console */
export const CountrySeed = async () => {
  console.log('Running country seed');
  const db = Container.get(DIMongoDB);
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
