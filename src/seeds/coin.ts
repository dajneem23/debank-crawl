import mongoDBLoader from '@/loaders/mongoDBLoader';
// import crypto_project from '../data/crypto_slate/json/crypto_project.json';
// import token_sector from '../data/crypto_slate/json/token_sector.json';
// import token_wallet from '../data/crypto_slate/json/token_wallet.json';
// import token_team from '../data/crypto_slate/json/token_team.json';
// import token_exchange from '../data/crypto_slate/json/token_exchange.json';
import coinsFile from '../data/crypto_slate/json/coins.json';
import { createDataFile, readDataFromFile } from './utils';
import { $countCollection } from '@/utils/mongoDB';
import fs from 'fs';

//   /* eslint-disable no-console */
export const CoinSeed = async () => {
  /* eslint-disable no-console */

  const db = await mongoDBLoader();
  const collection = db.collection('coins');
  const count = await $countCollection({ collection });
  const categories = await db.collection('categories').find({}).toArray();
  createDataFile({
    _collection: 'coins',
    _file: coinsFile,
    _key: 'name',
  });
  if (count) return;
  const coins = await Promise.all(
    readDataFromFile({ _collection: 'coins' })
      .map((_coin: any) => {
        return {
          name: _coin.name,
          token_id: _coin.token_id,
          about: _coin.about,
          video: _coin.video || '',
          avatar: _coin['avatar-src'] || '',
          blog: _coin['blog-href'] || '',
          facebook: _coin['facebook-href'] || '',
          youtube: _coin['youtube-href'] || '',
          reddit: _coin['reddit-href'] || '',
          explorer: _coin['explorer-href'] || '',
          stack_exchange: _coin['stackexchange-href'] || '',
          website: _coin['project_website-href'] || '',
          telegram: _coin['telegram-href'] || '',
          whitepaper: _coin['whitepaper-href'] || '',
          twitter: _coin['twitter-href'] || '',
          discord: _coin['discord-href'] || '',
          bitcoin_talk: _coin['bitcoin_talk-href'] || '',
          gitter: _coin['gitter-href'] || '',
          medium: _coin['medium-href'] || '',
          categories: _coin.sectors.map((sector: any) => sector.sectors),
          blockchains: _coin.blockchain_tag.map((blockchain: any) => blockchain.blockchain_tag),
          services: _coin.services.map((service: any) => service.services),
          features: _coin.features.map((feature: any) => feature.features),
          technologies: _coin.technologies
            .map((technology: any) => {
              return _coin.technology_name
                .map((_technology_name: any) => _technology_name.technology_name)
                .reduce((pName: any, cName: any) => {
                  if (technology.technologies?.includes(cName)) {
                    // pName['key'] = cName.toLowerCase().replace(' ', '_');
                    // pName['value'] = technology.technologies.replace(cName, '').trim();
                    pName[cName.toLowerCase().replace(' ', '_').replace('.', '')] = technology.technologies
                      .replace(cName, '')
                      .trim();
                  }
                  return pName;
                }, {});
            })
            .reduce((pIco: any, cIco: any) => {
              return { ...pIco, ...cIco };
            }, {}),
          exchanges: _coin.exchanges.map((exchange: any) => exchange['exchanges-title']),
          wallets: _coin.wallets.map((wallet: any) => wallet['wallets-title']),
          team: _coin.person_name.map((person_name: any) => {
            const personIndex = _coin.person_position.findIndex(
              (person: any) => person.person_position == person_name.person_name,
            );
            return {
              name: person_name.person_name,
              position: _coin.person_position[personIndex + 1].person_position,
            };
          }),
          companies: _coin.company.map((company: any) => {
            return {
              name: company['company-title'],
            };
          }),
          ico: _coin.ico_details
            .map((ico_detail: any) => {
              return _coin.ico_name
                .map((_ico_name: any) => _ico_name.ico_name)
                .reduce((pName: any, cName: any) => {
                  if (ico_detail.ico_details?.includes(cName)) {
                    // pName['key'] = cName.replace('ICO', '').trim().toLowerCase();
                    // pName['value'] = ico_detail.ico_details.replace(cName, '').trim();
                    pName[cName.replaceAll('at ICO', '').replace('ICO', '').trim().toLowerCase().replace(' ', '_')] =
                      ico_detail.ico_details.replace(cName, '').trim();
                  }
                  return pName;
                }, {});
            })
            .reduce((pIco: any, cIco: any) => {
              return { ...pIco, ...cIco };
            }, {}),
          trans: [] as any,
          deleted: false,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: 'admin',
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
                      name: {
                        $regex: _category
                          .toLowerCase()
                          .match(/[a-zA-Z0-9_ ]+/g)
                          .join('')
                          .trim()
                          .replace(' ', '_'),
                        $options: 'i',
                      },
                    },
                    {
                      $setOnInsert: {
                        title: _category,
                        type: 'crypto',
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
                        trans: [],
                        sub_categories: [],
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
  // fs.writeFileSync(`${__dirname}/data/coins_final.json`, JSON.stringify(coins));
  // coins = JSON.parse(JSON.stringify(coins).replace(/null/g, '""'));
  console.log('Inserting coins', coins.length);
  await db.collection('coins').insertMany(coins);
};
