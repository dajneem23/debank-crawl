import mongoDBLoader from '@/loaders/mongoDBLoader';
import { countCollection } from '@/utils/common';
import crypto_product from '../data/crypto_slate/json/crypto_product.json';
import product_feature from '../data/crypto_slate/json/product_feature.json';
import product_gallery from '../data/crypto_slate/json/product_gallery.json';
import product_ccy from '../data/crypto_slate/json/product_ccy.json';
import product_team from '../data/crypto_slate/json/product_team.json';
import product_categories from '../data/crypto_slate/json/product_category.json';
export const ProductSeed = async () => {
  /* eslint-disable no-console */
  console.log('Running product seed');
  const db = await mongoDBLoader();
  const collection = db.collection('products');
  const count = await countCollection(collection);
  if (!count) {
    const categories = await db.collection('categories').find({}).toArray();
    const products = [];
    products.push(
      ...crypto_product.map((_product) => {
        const {
          name,
          director,
          avatar,
          blog,
          medium,
          reddit,
          twitter,
          youtube,
          facebook,
          linkedin,
          telegram,
          instagram,
          about,
          ios_app,
          google_play_app,
          chrome_extension,
          mac_app,
          linux_app,
          windows_app,
          wiki,
          email,
          website,
          tel,
        } = _product;
        return {
          name,
          director,
          avatar,
          blog,
          medium,
          reddit,
          twitter,
          youtube,
          facebook,
          linkedin,
          telegram,
          instagram,
          about,
          ios_app,
          google_play_app,
          chrome_extension,
          mac_app,
          linux_app,
          windows_app,
          wiki,
          email,
          website,
          tel,
          galleries: product_gallery
            .filter((product) => product.product_name == name)
            .map((gallery) => {
              return {
                url: gallery.gallery,
              };
            }),
          ccys: product_ccy
            .filter((product) => product.product_name == name)
            .map((ccy) => {
              return ccy.ccy;
            }),
          features: product_feature
            .filter((product) => product.product_name == name)
            .map((feature) => {
              return feature.feature;
            }),
          teams: product_team
            .filter((product) => product.product_name == name)
            .map((team) => {
              return team.team;
            }),
          categories: product_categories
            .filter((product) => product.product_name == name)
            .map((category) => {
              return categories.find((_category) => {
                return _category.title == category.category;
              })?._id;
            }),
          created_at: new Date(),
          updated_at: new Date(),
        };
      }),
    );

    console.log('Inserting products', products.length);
    await collection.insertMany(products);
  }
};
