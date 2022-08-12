// import company_sector from '../data/crypto_slate/json/company_sector.json';
// import token_sector from '../data/crypto_slate/json/token_sector.json';
// import mongoDBLoader from '@/loaders/mongoDBLoader';
// import { $toObjectId, $countCollection } from '@/utils/mongoDB';
// export const SectorSeed = async () => {
//   /* eslint-disable no-console */
//   console.log('Running sector seed');
//   const db = await mongoDBLoader();
//   const collection = db.collection('sectors');
//   const count = await $countCollection({ collection });
//   if (!count) {
//     console.log('Inserting sectors', uniqueSectors.length);
//     await collection.insertMany(uniqueSectors);
//   }
// };
