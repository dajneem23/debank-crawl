import mongoDBLoader from '@/loaders/mongoDBLoader';
import { countCollection } from '@/utils/common';
/* eslint-disable no-console */
export const EventSeed = async () => {
  console.log('Running event seed');
  const db = await mongoDBLoader();
  const collection = db.collection('events');
  const count = await countCollection(collection);
  const items = await db.collection('events').find({}).toArray();
};
const InsertEvent = async ({ collection, items }: { collection: any; items: any[] }) => {
  await collection.insertMany(items);
};
