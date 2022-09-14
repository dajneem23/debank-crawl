import mongoDBLoader from '@/loaders/mongoDBLoader';
import { $toObjectId, $countCollection } from '@/utils/mongoDB';
import Container, { Inject, Service } from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDBLoader';
/* eslint-disable no-console */
export const EventSeed = async () => {
  console.log('Running event seed');
  const db = Container.get(DIMongoDB);
  const collection = db.collection('events');
  const count = await $countCollection({ collection });
  const items = await db.collection('events').find({}).toArray();
};
const InsertEvent = async ({ collection, items }: { collection: any; items: any[] }) => {
  await collection.insertMany(items);
};
