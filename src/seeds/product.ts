import mongoDBLoader from '@/loaders/mongoDBLoader';
import { $toObjectId, $countCollection } from '@/utils/mongoDB';
import fs from 'fs';
import productsFile from '../data/crypto_slate/json/products.json';
import { createDataFile, readDataFromFile } from './utils';
import Container from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDBLoader';
import slugify from 'slugify';
import { RemoveSlugPattern } from '@/types';

/* eslint-disable no-console */
export const ProductSeed = async () => {
  console.log('Running product seed');
  const db = Container.get(DIMongoDB);

  const collection = db.collection('products');
  const count = await $countCollection({ collection });
  if (count) return;
  const categories = await db.collection('categories').find({}).toArray();
  /* eslint-disable no-console */
  createDataFile({
    _collection: 'products',
    _file: productsFile,
    _key: 'name',
  });
  const products = await Promise.all(
    readDataFromFile({ _collection: 'products' }).map((_product: any) => {
      return {
        trans: [] as any,
        deleted: false,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'admin',
        name:
          _product.verified != 'null' && _product.verified
            ? _product.name
                .replace(_product.verified.replace('Verified Social Credentials', ''), '')
                .replace('Verified', '')
                .trim()
            : _product.name.trim(),
        avatar: !!_product['avatar-src'] ? _product['avatar-src'] : '',
        verified: !!_product.verified,
        sponsored: !!_product.sponsored,
        about: Array.isArray(_product.about) ? _product.about.join('\n') : _product.about,
        categories: _product.tags.map((category: any) => category.tags) || [],
        urls: {
          galleries: _product.gallery.map((gallery: any) => gallery['gallery-src']).filter(Boolean),
          website: _product.website && _product.website[0] && [_product.website[0]['website-href']].filter(Boolean),
          facebook:
            _product.facebook && _product.facebook[0] && [_product.facebook[0]['facebook-href']].filter(Boolean),
          telegram:
            _product.telegram && _product.telegram[0] && [_product.telegram[0]['telegram-href']].filter(Boolean),
          twitter: _product.twitter && _product.twitter[0] && [_product.twitter[0]['twitter-href']].filter(Boolean),
          youtube: _product.youtube && _product.youtube[0] && [_product.youtube[0]['youtube-href']].filter(Boolean),
          discord: _product.discord && _product.discord[0] && [_product.discord[0]['discord-href']].filter(Boolean),
          medium: _product.medium && _product.medium[0] && [_product.medium[0]['medium-href']].filter(Boolean),
          reddit: _product.reddit && _product.reddit[0] && [_product.reddit[0]['reddit-href']].filter(Boolean),
          blog: _product.blog && _product.blog[0] && [_product.blog[0]['blog-href']].filter(Boolean),
          rocket_chat:
            _product.rocket_chat &&
            _product.rocket_chat[0] &&
            [_product.rocket_chat[0]['rocket_chat-href']].filter(Boolean),
        },
        features: _product.features.map((features: any) => features.features),
        parent_company:
          !!_product.company && _product.company[0]
            ? _product.company[0]['company'].replace('Parent Company', '').trim()
            : '',
        team_location:
          !!_product.team_location && _product.team_location[0]
            ? _product.team_location[0]['team_location'].replace('Team Location', '').trim()
            : '',
        cryptocurrencies: _product.cryptocurrencies.map(
          (cryptocurrency: any) => cryptocurrency['cryptocurrencies-title'],
        ),
        contract_addresses: _product.contract_addresses.map((contract_address: any) => {
          return {
            address: contract_address['contract_addresses'],
            url: contract_address['contract_addresses-href'],
          };
        }),

        information: _product.information
          .map((information: any) => {
            if (!!information['information-title']) {
              return {
                blockchain: information['information-title'],
              };
            } else {
              const INFORMATIONS = ['Release', 'Team Location', 'Token', 'Parent Company', 'Software License'];
              return INFORMATIONS.map((_information) => {
                if (information['information'].includes(_information)) {
                  return {
                    [_information.toLowerCase().replaceAll(' ', '_')]: information['information']
                      .replace(_information, '')
                      .trim(),
                  };
                }
              });
            }
          })
          .flat()
          .filter(Boolean)
          .reduce((pIco: any, cIco: any) => {
            return { ...pIco, ...cIco };
          }, {}),
        supports: _product.supports.map((support: any) => {
          return {
            name: support.supports,
            url: support['supports-href'],
          };
        }),
        apps: _product.download.map((download: any) => {
          return {
            name: download.download,
            url: download['download-href'],
          };
        }),
        team: _product.person_name.map((person_name: any) => {
          const personIndex = _product.person_detail.findIndex(
            (person: any) => person.person_detail == person_name.person_name,
          );
          const person = _product.team_persons.find((_person: any) =>
            _person.team_persons.includes(person_name.person_name),
          ).team_persons;
          const personTwitter = _product.person_twitter.find(
            (person_twitter: any) =>
              person && person.includes(person_twitter.person_twitter) && person_twitter.person_twitter,
          );
          const personGithub = _product.person_github.find(
            (person_github: any) =>
              person && person.includes(person_github.person_github) && person_github.person_github,
          );
          const personLinkedin = _product.person_linkedin.find(
            (person_linkedin: any) =>
              person && person.includes(person_linkedin.person_linkedin) && person_linkedin.person_linkedin,
          );
          if (personTwitter) {
            const foundIndex = _product.person_twitter.findIndex(
              (person_twitter: any) =>
                person && person.includes(person_twitter.person_twitter) && person_twitter.person_twitter,
            );
            if (foundIndex > -1) {
              _product.person_twitter.splice(foundIndex, 1);
            }
          }
          if (personGithub) {
            const foundIndex = _product.person_github.findIndex(
              (person_github: any) =>
                person && person.includes(person_github.person_github) && person_github.person_github,
            );
            if (foundIndex > -1) {
              _product.person_github.splice(foundIndex, 1);
            }
          }
          if (personLinkedin) {
            const foundIndex = _product.person_linkedin.findIndex(
              (person_linkedin: any) =>
                person && person.includes(person_linkedin.person_linkedin) && person_linkedin.person_linkedin,
            );
            if (foundIndex > -1) {
              _product.person_linkedin.splice(foundIndex, 1);
            }
          }
          return {
            name: person_name.person_name,
            position: _product.person_detail[personIndex + 1].person_detail,
            contacts: [
              ...[
                personTwitter && {
                  name: personTwitter.person_twitter,
                  url: personTwitter['person_twitter-href'],
                },
              ],
              ...[
                personGithub && {
                  name: personGithub.person_github,
                  url: personGithub['person_github-href'],
                },
              ],
              ...[
                personLinkedin && {
                  name: personLinkedin.person_linkedin,
                  url: personLinkedin['person_linkedin-href'],
                },
              ],
            ].filter(Boolean),
          };
        }),
      };
    }),
  );
  console.log('Inserting products', products.length);
  fs.writeFileSync(`${__dirname}/data/_products.json`, JSON.stringify(products).replace(/null/g, '""'));
};
export const insertProducts = async () => {
  const db = Container.get(DIMongoDB);
  const count = await db.collection('products').countDocuments();
  if (count) return;
  const categories = await db.collection('categories').find({}).toArray();
  const productsFinal = await Promise.all(
    JSON.parse(fs.readFileSync(`${__dirname}/data/_products.json`, 'utf8') as any).map(async (item: any) => {
      return {
        ...item,
        slug: slugify(item.name, { lower: true, trim: true, remove: RemoveSlugPattern }),
        categories: await Promise.all(
          item.categories
            .filter(
              (item: any, index: any, items: any) =>
                items.findIndex((item2: any) => item2.toLowerCase() == item.toLowerCase()) == index,
            )
            .map(async (_category: any): Promise<any> => {
              return slugify(_category, { lower: true, trim: true, replacement: '-', remove: RemoveSlugPattern });

              // return (
              //   categories.find((category) => {
              //     return (
              //       category.title.toLowerCase() == _category.toLowerCase() ||
              //       category.title.toLowerCase().includes(_category.toLowerCase()) ||
              //       _category.toLowerCase().includes(category.title.toLowerCase())
              //     );
              //   })?._id ||
              //   (
              //     await db.collection('categories').findOneAndUpdate(
              //       {
              //         title: { $regex: _category, $options: 'i' },
              //       },
              //       {
              //         $setOnInsert: {
              //           title: _category,
              //           type: 'product',
              //           name: _category
              //             .toLowerCase()
              //             .match(/[a-zA-Z0-9_ ]+/g)
              //             .join('')
              //             .trim()
              //             .replaceAll(' ', '_'),
              //           trans: [],
              //           sub_categories: [],
              //           weight: 0,
              //           deleted: false,
              //           created_at: new Date(),
              //           updated_at: new Date(),
              //           created_by: 'admin',
              //         },
              //       },
              //       {
              //         upsert: true,
              //         returnDocument: 'after',
              //       },
              //     )
              //   ).value._id
              // );
            }),
        ),
        cryptocurrencies: await Promise.all(
          item.cryptocurrencies?.map(async (cryptocurrency: any) => {
            const currency = await db.collection('assets').findOne({ name: cryptocurrency });
            return currency ? currency._id : null;
          }) || [],
        ),
      };
    }),
  );
  await db.collection('products').insertMany(productsFinal);
  console.log('Inserted products', productsFinal.length);
};
