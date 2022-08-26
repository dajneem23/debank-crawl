import mongoDBLoader from '@/loaders/mongoDBLoader';
import { $toObjectId, $countCollection } from '@/utils/mongoDB';

// export const ProductSeed = async () => {
//   /* eslint-disable no-console */
//   console.log('Running product seed');
//   const db = await mongoDBLoader();
//   const collection = db.collection('products');
//   const count = await $countCollection({ collection });
//   if (!count) {
//     const categories = await db.collection('categories').find({}).toArray();
import fs from 'fs';
import productsFile from '../data/crypto_slate/json/products.json';
import { createDataFile, readDataFromFile } from './utils';

/* eslint-disable no-console */
export const ProductSeed = async () => {
  console.log('Running product seed');
  const db = await mongoDBLoader();
  const collection = db.collection('products');
  const count = await $countCollection({ collection });
  if (!count) {
    const categories = await db.collection('categories').find({}).toArray();
    /* eslint-disable no-console */
    createDataFile({
      _collection: 'products',
      _file: productsFile,
      _key: 'name',
    });
    const products = await Promise.all(
      readDataFromFile({ _collection: 'products' })
        .map((_product: any) => {
          return {
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
                : _product.name,
            avatar: !!_product['avatar-src'] ? _product['avatar-src'] : '',
            verified: !!_product.verified,
            sponsored: !!_product.sponsored,
            about: _product.about,
            galleries: _product.gallery.map((gallery: any) => gallery['gallery-src']),
            categories: _product.tags.map((category: any) => category.tags) || [],
            website: (_product.website && _product.website[0] && _product.website[0]['website-href']) || '',
            facebook: (_product.facebook && _product.facebook[0] && _product.facebook[0]['facebook-href']) || '',
            telegram: (_product.telegram && _product.telegram[0] && _product.telegram[0]['telegram-href']) || '',
            twitter: (_product.twitter && _product.twitter[0] && _product.twitter[0]['twitter-href']) || '',
            youtube: (_product.youtube && _product.youtube[0] && _product.youtube[0]['youtube-href']) || '',
            discord: (_product.discord && _product.discord[0] && _product.discord[0]['discord-href']) || '',
            medium: (_product.medium && _product.medium[0] && _product.medium[0]['medium-href']) || '',
            reddit: (_product.reddit && _product.reddit[0] && _product.reddit[0]['reddit-href']) || '',
            blog: (_product.blog && _product.blog[0] && _product.blog[0]['blog-href']) || '',
            features: _product.features.map((features: any) => features.features),
            parent_company:
              !!_product.company && _product.company[0]
                ? _product.company[0]['company'].replace('Parent Company', '').trim()
                : '',
            team_location:
              !!_product.team_location && _product.team_location[0]
                ? _product.team_location[0]['team_location'].replace('Team Location', '').trim()
                : '',
            crypto_currencies: _product.cryptocurrencies.map(
              (cryptocurrency: any) => cryptocurrency['cryptocurrencies-title'],
            ),
            contract_addresses: _product.contract_addresses.map((contract_address: any) => {
              return {
                address: contract_address['contract_addresses'],
                url: contract_address['contract_addresses-href'],
              };
            }),
            rocket_chat:
              (_product.rocket_chat && _product.rocket_chat[0] && _product.rocket_chat[0]['rocket_chat-href']) || '',

            informations: _product.information
              .map((information: any) => {
                if (!!information['information-title']) {
                  return {
                    Blockchain: information['information-title'],
                  };
                } else {
                  const INFORMATIONS = ['Release', 'Team Location', 'Token', 'Parent Company', 'Software License'];
                  return INFORMATIONS.map((_information) => {
                    if (information['information'].includes(_information)) {
                      return {
                        [_information]: information['information'].replace(_information, '').trim(),
                      };
                    }
                  });
                }
              })
              .flat()
              .filter(Boolean),
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
              // console.log('personIndex', personIndex, typeof person_name);
              // console.log(_product.team_persons);
              const person = _product.team_persons.find((_person: any) =>
                _person.team_persons.includes(person_name.person_name),
              ).team_persons;
              // console.log({ person, person_name });
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
        })
        .map(async (item: any) => {
          return {
            ...item,
            categories: await Promise.all(
              item.categories.map(async (_category: any): Promise<any> => {
                return (
                  categories.find((category) => {
                    return (
                      category.title.toLowerCase() == _category.toLowerCase() ||
                      category.title.toLowerCase().includes(_category.toLowerCase()) ||
                      _category.toLowerCase().includes(category.title.toLowerCase())
                    );
                  })?._id ||
                  (
                    await db.collection('categories').findOneAndUpdate(
                      {
                        title: { $regex: _category, $options: 'i' },
                      },
                      {
                        $setOnInsert: {
                          title: _category,
                          type: 'product',
                          name: _category
                            .toLowerCase()
                            .match(/[a-zA-Z0-9_ ]+/g)
                            .join('')
                            .trim()
                            .replace(' ', '_'),
                          acronym: _category
                            .toLowerCase()
                            .match(/[a-zA-Z0-9_ ]+/g)
                            .join('')
                            .trim()
                            .split(' ')
                            .map((word: any, _: any, list: any) => {
                              return list.length > 1 ? word[0] : list.slice(0, 1);
                            })
                            .join(''),
                          weight: Math.floor(Math.random() * 100),
                          deleted: false,
                          created_at: new Date(),
                          updated_at: new Date(),
                          created_by: 'admin',
                        },
                      },
                      {
                        upsert: true,
                        returnDocument: 'after',
                      },
                    )
                  ).value._id
                );
              }),
            ),
          };
        }),
    );
    console.log('Inserting products', products.length);
    fs.writeFileSync(`${__dirname}/data/products_final.json`, JSON.stringify(products).replace(/null/g, '""'));
    await db.collection('products').insertMany(products);
  }
};