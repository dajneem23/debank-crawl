// import company_sector from '../data/crypto_slate/json/company_sector.json';
// import token_sector from '../data/crypto_slate/json/token_sector.json';
// import mongoDBLoader from '@/loaders/mongoDBLoader';
// import { countCollection } from '@/utils/common';
// import product_team from '../data/crypto_slate/json/product_team.json';
// import token_team from '../data/crypto_slate/json/token_team.json';
// import company_team from '../data/crypto_slate/json/company_team.json';
// export const teameed = async () => {
//   /* eslint-disable no-console */
//   console.log('Running sector seed');
//   const db = await mongoDBLoader();
//   const collection = db.collection('team');
//   const count = await countCollection(collection);
// var team = [];
// if (!count) {
//   console.log('Inserting team');
//   await collection.insertMany();
// }
// };