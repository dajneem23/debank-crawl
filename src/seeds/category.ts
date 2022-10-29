/* eslint-disable no-console */
import { CATEGORY_TYPE, RemoveSlugPattern } from '../types/Common';
// import product_category from '../data/crypto_slate/json/product_category.json';
import categories_event from '../data/crypto_slate/json/event-categories.json';
import categories_crypto from '../data/crypto_slate/json/cryptoasset-categories.json';
import categories_news from '../data/crypto_slate/json/news-categories.json';
import categories_crypto_2 from '../data/crypto_slate/json/crypto-categories.json';
import categoriesFile from '../data/crypto_slate/json/categories.json';
import addon_categories from '../data/addon_categories.json';
// import categories_crypto from '../data/categories_crypto_asset.json';
import { $countCollection } from '@/utils/mongoDB';
import Container from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDBLoader';
import slugify from 'slugify';
import assetCategoriesBK from '../data/backup/asset-categories.json';
import fs from 'fs';
import categoriesBK from '../data/backup/categories.json';
import { omitBy, uniq, isNil } from 'lodash';

export const CategorySeed = async () => {
  const db = Container.get(DIMongoDB);
  const collection = db.collection('categories');
  const count = await $countCollection({ collection });
  if (count) return;
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
        type: CATEGORY_TYPE.CRYPTO_SECTOR,
      };
    }),
    ...categoriesFile[0]['coin-sectors'].map((item: any) => {
      return {
        title: item['coin-sectors'].split(' ').join(' '),
        type: CATEGORY_TYPE.CRYPTO_SECTOR,
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
  const uniqueCategories = await Promise.all(
    categories
      .map((item: any) => {
        return {
          ...item,
          title: item.title
            .match(/[a-zA-Z0-9_ ]+/g)
            .join('')
            .trim(),
          name: slugify(item.title, {
            lower: true,
            trim: true,
            replacement: '-',
            remove: /[`~!@#$%^&*()+{}[\]\\|,.//?;':"]/g,
          }),
          trans: [],
          deleted: false,
          weight: item.weight || 0,
          created_at: new Date(),
          updated_at: new Date(),
          rank: 0,
          created_by: 'admin',
        };
      })
      .map(async (_item: any, index) => {
        return {
          ..._item,
          sub_categories:
            (await Promise.all(
              _item?.sub_categories?.map(async (item: any) => {
                return (
                  await db.collection('categories').findOneAndUpdate(
                    {
                      name: {
                        $regex: slugify(item.title, {
                          lower: true,
                          trim: true,
                          replacement: '-',
                          remove: RemoveSlugPattern,
                        }),
                        $options: 'i',
                      },
                    },
                    {
                      ...((item.sub_categories?.length && {
                        $set: {
                          sub_categories: item.sub_categories,
                        },
                      }) ||
                        {}),
                      $setOnInsert: {
                        title: item.title,
                        // type: item.type,
                        name: slugify(item.title, {
                          lower: true,
                          trim: true,
                          replacement: '-',
                          remove: /[`~!@#$%^&*()+{}[\]\\|,.//?;':"]/g,
                        }),
                        trans: [],
                        sub_categories: [],
                        weight: item.weight || 0,
                        deleted: false,
                        created_at: new Date(),
                        updated_at: new Date(),
                        created_by: 'admin',
                        rank: item.rank || _item.rank + 1,
                      },
                      $addToSet: {
                        type: item.type,
                      } as any,
                    },
                    {
                      upsert: true,
                      returnDocument: 'after',
                    },
                  )
                ).value.name;
              }) || [],
            )) ?? [],
        };
      }),
  );
  await Promise.all(
    uniqueCategories.map(async (item: any) => {
      return await db.collection('categories').findOneAndUpdate(
        {
          name: {
            $regex: slugify(item.title, {
              lower: true,
              trim: true,
              replacement: '-',
              remove: RemoveSlugPattern,
            }),
            $options: 'i',
          },
        },
        {
          ...((item.sub_categories?.length && {
            $set: {
              sub_categories: item.sub_categories,
            },
          }) ||
            {}),
          $setOnInsert: {
            title: item.title,
            name: slugify(item.title, {
              lower: true,
              trim: true,
              replacement: '-',
              remove: RemoveSlugPattern,
            }),
            ...((!item.sub_categories?.length && {
              sub_categories: item.sub_categories,
            }) ||
              {}),
            weight: item.weight || 0,
            deleted: false,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: 'admin',
            rank: item.rank,
          },
          $addToSet: {
            type: item.type,
          } as any,
        },
        {
          upsert: true,
          returnDocument: 'after',
        },
      );
    }),
  );

  console.log('Inserting categories', uniqueCategories.length);
  // fs.writeFileSync(`${__dirname}/data/categories_final.json`, JSON.stringify(uniqueCategories).replace(/null/g, '""'));
  // await collection.insertMany(uniqueCategories);
};

export const mappingCategories = async () => {
  let count = 0;
  for (const category of categoriesBK) {
    for (const assetCategory of assetCategoriesBK) {
      if (
        assetCategory.dics.includes(category.title) ||
        assetCategory.dics.includes(category.name) ||
        assetCategory.dics.includes(category.title.toLowerCase()) ||
        assetCategory.dics.includes(category.name.toLowerCase()) ||
        assetCategory.slug === category.name ||
        assetCategory.name === category.title
      ) {
        (assetCategory as any).type = uniq([...((assetCategory as any).type || []), ...category.type]);
        count++;
        break;
      }
    }
  }
  const mapping = assetCategoriesBK.map(({ name, slug, ...rest }: any) => ({
    title: name,
    name: slug,
    ...rest,
  }));
  console.log('Mapping categories', count);
  fs.writeFileSync(`${__dirname}/data/mapping-categories.json`, JSON.stringify(mapping));
};
