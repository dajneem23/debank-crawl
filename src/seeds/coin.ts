// import crypto_project from '../data/crypto_slate/json/crypto_project.json';
// import token_sector from '../data/crypto_slate/json/token_sector.json';
// import token_wallet from '../data/crypto_slate/json/token_wallet.json';
// import token_team from '../data/crypto_slate/json/token_team.json';
// import token_exchange from '../data/crypto_slate/json/token_exchange.json';
import coinsFile from '../data/crypto_slate/json/coins.json';
import { createDataFile, readDataFromFile } from './utils';
import { $countCollection } from '@/utils/mongoDB';
import fs from 'fs';
import Container from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDBLoader';
import slugify from 'slugify';
import { RemoveSlugPattern } from '@/types';
import { uniq } from 'lodash';
//   /* eslint-disable no-console */
export const CoinSeed = async () => {
  /* eslint-disable no-console */

  const db = Container.get(DIMongoDB);

  const collection = db.collection('assets');
  const count = await $countCollection({ collection });
  createDataFile({
    _collection: 'assets',
    _file: coinsFile,
    _key: 'name',
  });
  if (count) return;
  const coins = await Promise.all(
    readDataFromFile({ _collection: 'assets' }).map((_coin: any) => {
      return {
        name: _coin.name.trim(),
        token_id: _coin.token_id,
        about: _coin.about,
        video: _coin.video || '',
        avatar: _coin['avatar-src'] || '',
        explorer: {
          name: _coin['explorer'] || '',
          url: _coin['explorer-href'],
        },
        urls: {
          blog: [_coin['blog-href']].filter(Boolean),
          facebook: [_coin['facebook-href']].filter(Boolean),
          youtube: [_coin['youtube-href']].filter(Boolean),
          reddit: [_coin['reddit-href']].filter(Boolean),
          stack_exchange: [_coin['stackexchange-href']].filter(Boolean),
          website: [_coin['project_website-href']].filter(Boolean),
          telegram: [_coin['telegram-href']].filter(Boolean),
          whitepaper: [_coin['whitepaper-href']].filter(Boolean),
          twitter: [_coin['twitter-href']].filter(Boolean),
          discord: [_coin['discord-href']].filter(Boolean),
          bitcoin_talk: [_coin['bitcoin_talk-href']].filter(Boolean),
          gitter: [_coin['gitter-href']].filter(Boolean),
          medium: [_coin['medium-href']].filter(Boolean),
        },
        categories: _coin.sectors.map((sector: any) => sector.sectors),
        blockchains: _coin.blockchain_tag.map((blockchain: any) =>
          slugify(blockchain.blockchain_tag, {
            lower: true,
            trim: true,
            replacement: '-',
            remove: RemoveSlugPattern,
          }),
        ),
        services: _coin.services.map((service: any) => service.services),
        features: _coin.features.map((feature: any) => feature.features),
        technologies: _coin.technologies
          .map((technology: any) => {
            return _coin.technology_name
              .map((_technology_name: any) => _technology_name.technology_name)
              .reduce((pName: any, cName: any) => {
                if (technology.technologies?.includes(cName)) {
                  // pName['key'] = cName.toLowerCase().replaceAll(' ', '_');
                  // pName['value'] = technology.technologies.replace(cName, '').trim();
                  pName[cName.toLowerCase().replaceAll(' ', '_').replace('.', '')] = technology.technologies
                    .replace(cName, '')
                    .trim();
                }
                return pName;
              }, {});
          })
          .reduce((pIco: any, cIco: any) => {
            return { ...pIco, ...cIco };
          }, {}),
        exchanges: uniq(
          _coin.exchanges
            .map((exchange: any) =>
              slugify(exchange['exchanges-title'], {
                lower: true,
                trim: true,
                replacement: '-',
                remove: RemoveSlugPattern,
              }),
            )
            .filter(Boolean),
        ),
        wallets: uniq(
          _coin.wallets
            .map(
              (wallet: any) =>
                wallet['wallets-title'] &&
                slugify(wallet['wallets-title'], {
                  lower: true,
                  trim: true,
                  replacement: '-',
                  remove: RemoveSlugPattern,
                }),
            )
            .filter(Boolean),
        ),
        team: _coin.person_name.map((person_name: any) => {
          const personIndex = _coin.person_position.findIndex(
            (person: any) => person.person_position == person_name.person_name,
          );
          return {
            name: person_name.person_name,
            position: _coin.person_position[personIndex + 1].person_position,
          };
        }),
        company: _coin.company.map((company: any) => {
          return slugify(company['company-title'], {
            lower: true,
            trim: true,
            replacement: '-',
            remove: RemoveSlugPattern,
          });
        })[0],
        ico: _coin.ico_details
          .map((ico_detail: any) => {
            return _coin.ico_name
              .map((_ico_name: any) => _ico_name.ico_name)
              .reduce((pName: any, cName: any) => {
                if (ico_detail.ico_details?.includes(cName)) {
                  // pName['key'] = cName.replace('ICO', '').trim().toLowerCase();
                  // pName['value'] = ico_detail.ico_details.replace(cName, '').trim();
                  pName[cName.replaceAll('at ICO', '').replace('ICO', '').trim().toLowerCase().replaceAll(' ', '_')] =
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
    }),
  );
  fs.writeFileSync(`${__dirname}/data/_coins.json`, JSON.stringify(coins));
  // coins = JSON.parse(JSON.stringify(coins).replace(/null/g, '""'));
  // console.log('Inserting coins', coins.length);
  // await db.collection('coins').insertMany(coins);
};
export const insertCoins = async () => {
  const db = Container.get(DIMongoDB);
  const collection = db.collection('assets');
  const count = await $countCollection({ collection });
  console.log('count', count);
  if (count) return;
  console.log('Inserting assets');
  try {
    const categories = await db.collection('categories').find({}).toArray();
    const coinsFinal = await Promise.all(
      JSON.parse(fs.readFileSync(`${__dirname}/data/_coins.json`, 'utf8') as any).map(async (item: any) => {
        // console.log('item', item.name);
        return {
          ...item,
          slug: slugify(item.name, { lower: true, trim: true, remove: RemoveSlugPattern }),
          categories: await Promise.all(
            item.categories.map(async (_category: any): Promise<any> => {
              return (
                await db.collection('categories').findOneAndUpdate(
                  {
                    name: {
                      $regex: slugify(_category, {
                        lower: true,
                        trim: true,
                        replacement: '-',
                        remove: RemoveSlugPattern,
                      }),
                      $options: 'i',
                    },
                  },
                  {
                    $setOnInsert: {
                      title: _category,
                      name: slugify(_category, {
                        lower: true,
                        trim: true,
                        replacement: '-',
                        remove: RemoveSlugPattern,
                      }),
                      trans: [],
                      sub_categories: [],
                      weight: 0,
                      deleted: false,
                      created_at: new Date(),
                      updated_at: new Date(),
                      created_by: 'admin',
                      rank: 0,
                    },
                    $addToSet: {
                      type: 'crypto_asset',
                    } as any,
                  },
                  {
                    upsert: true,
                    returnDocument: 'after',
                  },
                )
              ).value.name;
            }),
          ),
        };
      }),
    );
    console.log('Inserting assets', coinsFinal.length);
    await db.collection('assets').insertMany(coinsFinal);
    console.log('Inserted assets', coinsFinal.length);
  } catch (error) {
    console.log('error', error);
  }
};
