import { CATEGORY_TYPE } from '../types/Common';
import product_category from '../data/crypto_slate/json/product_category.json';
import categories_event from '../data/categories_event.json';
import categories_crypto from '../data/categories_crypto_asset.json';
import mongoDBLoader from '@/loaders/mongoDBLoader';
import { countCollection } from '@/utils/common';
export const CategorySeed = async () => {
  /* eslint-disable no-console */

  console.log('Running category seed');
  const db = await mongoDBLoader();
  const collection = db.collection('categories');
  const count = await countCollection(collection);
  if (!count) {
    const categories = [];
    categories.push(
      ...product_category.map((item) => {
        return {
          title: item.category,
          type: CATEGORY_TYPE.WIKIBLOCK,
          weight: Math.floor(Math.random() * 100),
          created_at: new Date(),
          updated_at: new Date(),
        };
      }),
      ...categories_event.map((item) => {
        return {
          title: item.title,
          weight: Math.floor(Math.random() * 100),
          type: CATEGORY_TYPE.EVENT,
          created_at: new Date(),
          updated_at: new Date(),
        };
      }),
      ...categories_crypto.map((item) => {
        return {
          title: item.title,
          weight: Math.floor(Math.random() * 100),
          type: CATEGORY_TYPE.CRYPTO_ASSET,
          created_at: new Date(),
          updated_at: new Date(),
        };
      }),
    );
    const uniqueCategories = categories.filter((item, index, self) => {
      return (
        self.findIndex((t) => {
          return t.title === item.title;
        }) === index
      );
    });
    console.log('Inserting categories', uniqueCategories.length);
    await collection.insertMany(uniqueCategories);
  }
};
