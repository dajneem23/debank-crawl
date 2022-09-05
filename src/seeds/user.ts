import mongoDBLoader from '@/loaders/mongoDBLoader';
import { $countCollection } from '@/utils/mongoDB';
import bcrypt from 'bcryptjs';
/* eslint-disable no-console */
export const UserSeed = async () => {
  console.log('Running event seed');
  const db = await mongoDBLoader();

  const collection = db.collection('users');
  const count = await $countCollection({ collection });
  if (!count) {
    const hashedPassword = bcrypt.hash('admin', 12);
    const user = {
      full_name: 'admin',
      email: 'admin@gmail.com',
      password: (await hashedPassword).toString(),
      phone: '12345678',
      id: 'admin',
      roles: ['admin'],
    };
    console.log('Inserting user');
    await collection.insertOne(user);
  }
};
