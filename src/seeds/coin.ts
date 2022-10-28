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
import { uniq, isNil, omitBy, rest } from 'lodash';
import cryptorankCoins from '../data/cryptorank/coins.json';
import cryptorankTags from '../data/cryptorank/coin-tags.json';
import cryptorankFunds from '../data/cryptorank/funds.json';
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
        symbol: _coin.token_id,
        description: _coin.about,
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
        categories: [
          ..._coin.sectors.map((sector: any) => sector.sectors),
          ..._coin.blockchain_tag.map((blockchain: any) =>
            slugify(blockchain.blockchain_tag, {
              lower: true,
              trim: true,
              replacement: '-',
              remove: RemoveSlugPattern,
            }),
          ),
        ],
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
export const cryptorankCoinsSeed = async () => {
  const coins = (cryptorankCoins as any).map(
    ({
      name,
      symbol,
      key: slug,
      rank,
      fundIds = [],
      fundingRounds: _fundraising_rounds,
      image = {},
      category,
      tagIds = [],
      tokens = [],
      fullyDilutedMarketCap: fully_diluted_market_cap,
      marketCap: market_cap,
      availableSupply: available_supply,
      totalSupply: total_supply,
    }: any) => {
      const fundraising_rounds = _fundraising_rounds.map(
        ({
          id,
          fundIds,
          leadFundIds,
          linkToAnnouncement: announcement,
          raise: amount,
          type: stage,
          priorityRating: priority_rating,
          coinId,
          ...rest
        }: any) => {
          return {
            id_of_sources: { cryptorank: id },
            announcement,
            amount,
            stage,
            asset_slug: slug,
            asset_symbol: symbol,
            asset_name: name,
            funds: fundIds.map((fundId: any) => {
              return (cryptorankFunds as any).find((fund: any) => fund.id == fundId)?.slug;
            }),
            lead_funds: leadFundIds.map((leadFundId: any) => {
              return (cryptorankFunds as any).find((fund: any) => fund.id == leadFundId)?.slug;
            }),
            priority_rating,
            ...rest,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: 'admin',
            deleted: false,
          };
        },
      );

      return omitBy(
        {
          id_of_sources: {
            cryptorank: slug,
          },
          name,
          slug,
          symbol,
          fundraising_rounds,
          cr_rank: rank,
          avatar: image?.native,
          categories: category?.split(',').map((category: string) =>
            slugify(category, {
              lower: true,
              trim: true,
              replacement: '-',
              remove: RemoveSlugPattern,
            }),
          ),
          urls: {
            avatar: Object.values(image),
          },
          fully_diluted_market_cap,
          market_cap,
          available_supply,
          total_supply,
          tokens: tokens.map(
            ({ platformName: name, platformKey: key, platformSlug: slug, explorerUrl: explorer, address }: any) => ({
              name,
              // key,
              slug,
              explorer: {
                name,
                url: explorer,
              },
              address,
            }),
          ),
          tags: tagIds?.map((tagId: string) => {
            return cryptorankTags.find((tag: any) => tag.id == tagId).slug;
          }),
          funds: fundIds.map((fundId: string) => {
            return (cryptorankFunds as any).find((fund: any) => fund.id == fundId)?.slug;
          }),
        },
        isNil,
      );
    },
  );
  const _coins = coins.map(({ fundraising_rounds, ...rest }: any) => {
    return {
      ...rest,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: 'admin',
      deleted: false,
    };
  });
  const fundraising_rounds = coins.map(({ fundraising_rounds }: any) => fundraising_rounds).flat();
  fs.writeFileSync(`${__dirname}/data/cryptorank-coins.json`, JSON.stringify(_coins));
  fs.writeFileSync(`${__dirname}/data/cryptorank-coins-fundraising_rounds.json`, JSON.stringify(fundraising_rounds));
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

export const mappingCoins = async () => {
  const db = Container.get(DIMongoDB);
  const collection = db.collection('assets');
  const assets = await collection.find({}).toArray();
  const cryptorankCoins = JSON.parse(fs.readFileSync(`${__dirname}/data/cryptorank-coins.json`, 'utf8') as any);
  const assetsMapping = assets.map(
    ({
      _id,
      id_of_sources,
      slug,
      avatar,
      tags = [],
      categories = [],
      name,
      fully_diluted_market_cap,
      market_cap,
      total_supply,
      urls: { urls_avatar = [], ...urls_rest } = {},
      ...rest
    }: any) => {
      const {
        id_of_sources: { cryptorank } = [],
        urls: { avatar: avatars_cryptorank = [] } = {},
        avatar: avatar_cryptorank,
        tags_cryptorank = [],
        categories_cryptorank = [],
        tokens,
        funds,
        cr_rank,
        fully_diluted_market_cap: fully_diluted_market_cap_cryptorank,
        market_cap: market_cap_cryptorank,
        available_supply,
        total_supply: total_supply_cryptorank,
      } = cryptorankCoins.find((coin: any) => coin.slug == slug || coin.name.toLowerCase() == name.toLowerCase()) || {};
      const index = cryptorankCoins.findIndex(
        (coin: any) => coin.slug == slug || coin.name.toLowerCase() == name.toLowerCase(),
      );
      if (index > -1) {
        cryptorankCoins.splice(index, 1);
      }
      return {
        id_of_sources: {
          ...id_of_sources,
          cryptorank,
        },
        name,
        slug,
        avatar: avatar_cryptorank || avatar,
        urls: {
          avatar: [...urls_avatar, ...avatars_cryptorank],
          ...urls_rest,
        },
        tokens,
        tags: uniq([...tags, ...tags_cryptorank]),
        categories: uniq([...categories, ...categories_cryptorank]),
        funds,
        cr_rank,
        fully_diluted_market_cap: fully_diluted_market_cap_cryptorank || fully_diluted_market_cap,
        market_cap: market_cap_cryptorank || market_cap,
        available_supply,
        total_supply: total_supply_cryptorank || total_supply,
        ...rest,
      };
    },
  );
  const _assetsMapping = [...assetsMapping, ...cryptorankCoins];
  console.log({
    cryptorank: cryptorankCoins.length,
    assets: assets.length,
    sum: _assetsMapping.length,
  });
  fs.writeFileSync(`${__dirname}/data/assets-mapping-cryptorank.json`, JSON.stringify(_assetsMapping));
};
