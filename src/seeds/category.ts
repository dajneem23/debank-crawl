/* eslint-disable no-console */
import { CATEGORY_TYPE } from '../types/Common';
// import product_category from '../data/crypto_slate/json/product_category.json';
import categories_event from '../data/crypto_slate/json/event-categories.json';
import categories_crypto from '../data/crypto_slate/json/cryptoasset-categories.json';
import categories_news from '../data/crypto_slate/json/news-categories.json';
import categories_crypto_2 from '../data/crypto_slate/json/crypto-categories.json';
import categoriesFile from '../data/crypto_slate/json/categories.json';
import addon_categories from '../data/crypto_slate/json/addon_categories.json';
// import categories_crypto from '../data/categories_crypto_asset.json';
import mongoDBLoader from '@/loaders/mongoDBLoader';
import { $countCollection } from '@/utils/mongoDB';
import fs from 'fs';
export const CategorySeed = async () => {
  const db = await mongoDBLoader();
  const collection = db.collection('categories');
  const count = await $countCollection({ collection });
  if (!count) {
    console.log('Running category seed');
    const categories = [
      ...categories_event.map((item) => {
        return {
          title: item.title,
          type: CATEGORY_TYPE.EVENT,
        };
      }),
      ...categories_crypto.map((item) => {
        return {
          title: item.title,
          type: CATEGORY_TYPE.CRYPTO_ASSET,
        };
      }),
      ...categories_news[0].news.map((item: any) => {
        return {
          title: item.news,
          type: CATEGORY_TYPE.NEWS,
        };
      }),
      ...categories_crypto_2[0].blockchains.map((item: any) => {
        const spans = categories_crypto_2[0]['blockchains-span'].map((span: any) => {
          return span['blockchains-span'];
        });
        console.log(spans);
        return {
          title: item.blockchains
            .split(' ')
            .filter((_item: any) => !spans.includes(_item))
            .join(' '),
          type: CATEGORY_TYPE.BLOCKCHAIN,
        };
      }),
      ...categories_crypto_2[0].applications.map((item: any) => {
        const spans = categories_crypto_2[0]['applications-span'].map((span: any) => {
          return span['applications-span'];
        });
        return {
          title: item.applications
            .split(' ')
            .filter((_item: any) => !spans.includes(_item))
            .join(' '),
          type: CATEGORY_TYPE.APPLICATION,
        };
      }),
      ...categories_crypto_2[0].consensus.map((item: any) => {
        const spans = categories_crypto_2[0]['consensus-span'].map((span: any) => {
          return span['consensus-span'];
        });
        return {
          title: item.consensus
            .split(' ')
            .filter((_item: any) => !spans.includes(_item))
            .join(' '),
          type: CATEGORY_TYPE.CONSENSUS,
        };
      }),
      ...categories_crypto_2[0].sectors.map((item: any) => {
        const spans = categories_crypto_2[0]['sectors-span'].map((span: any) => {
          return span['sectors-span'];
        });
        return {
          title: item.sectors
            .split(' ')
            .filter((_item: any) => !spans.includes(_item))
            .join(' '),
          type: CATEGORY_TYPE.CRYPTO,
        };
      }),
      ...categoriesFile[0]['coin-sectors'].map((item: any) => {
        return {
          title: item['coin-sectors'].split(' ').join(' '),
          type: CATEGORY_TYPE.CRYPTO,
        };
      }),
      ...categoriesFile[0]['people-categories'].map((item: any) => {
        return {
          title: item['people-categories'].split(' ').join(' '),
          type: CATEGORY_TYPE.PERSON,
        };
      }),
      ...categoriesFile[0]['company-categories'].map((item: any) => {
        return {
          title: item['company-categories'].split(' ').join(' '),
          type: CATEGORY_TYPE.COMPANY,
        };
      }),
      ...categoriesFile[0]['product-categories'].map((item: any) => {
        return {
          title: item['product-categories'].split(' ').join(' '),
          type: CATEGORY_TYPE.PRODUCT,
        };
      }),
      ...addon_categories,
    ];
    const uniqueCategories = categories
      .map((item) => {
        return {
          ...item,
          title: item.title
            .match(/[a-zA-Z0-9_ ]+/g)
            .join('')
            .trim(),
          name: item.title
            .toLowerCase()
            .match(/[a-zA-Z0-9_ ]+/g)
            .join('')
            .trim()
            .replace(' ', '_'),
          acronym: item.title
            .toLowerCase()
            .match(/[a-zA-Z0-9_ ]+/g)
            .join('')
            .trim()
            .split(' ')
            .map((word: any, _: any, list: any) => {
              return list.length > 1 ? word[0] : list.slice(0, 1);
            })
            .join(''),
          deleted: false,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: 'admin',
        };
      })
      .filter((item, index, self) => {
        return (
          self.findIndex((t) => {
            return t.name === item.name;
          }) === index &&
          self.findIndex((t) => {
            return t.acronym === item.acronym;
          }) === index
        );
      })
      .map((item, index) => {
        return {
          ...item,
          weight: index + 1,
        };
      });
    console.log('Inserting categories', uniqueCategories.length);
    fs.writeFileSync(
      `${__dirname}/data/categories_final.json`,
      JSON.stringify(uniqueCategories).replace(/null/g, '""'),
    );
    await collection.insertMany(uniqueCategories);
  }
};
