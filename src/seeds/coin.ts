import mongoDBLoader from '@/loaders/mongoDBLoader';
// import crypto_project from '../data/crypto_slate/json/crypto_project.json';
// import token_sector from '../data/crypto_slate/json/token_sector.json';
// import token_wallet from '../data/crypto_slate/json/token_wallet.json';
// import token_team from '../data/crypto_slate/json/token_team.json';
// import token_exchange from '../data/crypto_slate/json/token_exchange.json';
import coinsFile from '../data/crypto_slate/json/coins.json';
import { createDataFile, readDataFromFile } from './utils';
import { $toObjectId, $countCollection } from '@/utils/mongoDB';
import fs from 'fs';

// export const CoinSeed = async () => {
//   /* eslint-disable no-console */

//   const db = await mongoDBLoader();
//   const collection = db.collection('coins');
//   const count = await $countCollection({ collection });
//   const sectors = await db
//     .collection('categories')
//     .find({
//       type: 'sector',
//     })
//     .toArray();
//   if (!count) {
//     const coins = [];
//     coins.push(
//       ...(crypto_project as []).map((_coin) => {
//         const {
//           name,
//           token_id,
//           unique_key,
//           consensus,
//           blockchain,
//           open_source,
//           hash_algorithm,
//           org_structure,
//           hardware_wallet,
//           development_status,
//           explorer,
//           white_paper,
//           website,
//           avatar,
//           blog,
//           medium,
//           reddit,
//           twitter,
//           youtube,
//           facebook,
//           linkedin,
//           telegram,
//           instagram,
//           about,
//         } = _coin;
//         return {
//           name,
//           avatar,
//           blog,
//           medium,
//           reddit,
//           twitter,
//           youtube,
//           facebook,
//           linkedin,
//           telegram,
//           instagram,
//           about,
//           token_id,
//           unique_key,
//           consensus,
//           blockchain,
//           open_source: open_source === 'Yes',
//           hash_algorithm: hash_algorithm == 'None' ? null : hash_algorithm,
//           org_structure,
//           hardware_wallet: hardware_wallet == 'Yes',
//           development_status,
//           explorer,
//           white_paper,
//           website,
//           categories: $toObjectId(
//             token_sector
//               .filter((company) => company.token_name == name)
//               .map((sector) => {
//                 return sectors.find((_sector) => {
//                   return _sector.title == sector.sector;
//                 })?._id;
//               }),
//           ),
//           wallets: token_wallet
//             .filter((wallet) => wallet.token_name == name)
//             .map((coin) => {
//               return {
//                 coin: coin.wallet,
//               };
//             }),
//           token_exchanges: token_exchange
//             .filter((exchange) => exchange.token_name == name)
//             .map((coin) => {
//               return {
//                 coin: coin.exchange,
//               };
//             }),
//           team: token_team
//             .filter((team) => team.token_name == name)
//             .map((team) => {
//               return team.team;
//             }),
//           deleted: false,
//           created_at: new Date(),
//           updated_at: new Date(),
//           created_by: 'admin',
//         };
//       }),
//     );
//     // console.log(coins.find((coin) => coin.wallets.length > 1));

//     console.log('Inserting coins', coins.length);
//     await collection.insertMany(coins);
//   }
// };
export const CoinSeed = async () => {
  /* eslint-disable no-console */

  const db = await mongoDBLoader();
  // const collection = db.collection('coins');
  // const count = await $countCollection({ collection });
  createDataFile({
    _collection: 'coins',
    _file: coinsFile,
    _key: 'name',
  });
  const coins = readDataFromFile({ _collection: 'coins' }).map((_coin: any) => {
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
      technologies: _coin.technologies.map((technology: any) => {
        return _coin.technology_name
          .map((_technology_name: any) => _technology_name.technology_name)
          .reduce((pName: any, cName: any) => {
            if (technology.technologies?.includes(cName)) {
              pName[cName.toLowerCase().replace(' ', '_')] = technology.technologies.replace(cName, '').trim();
            }
            return pName;
          }, {});
      }),
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
      ico: _coin.ico_details.map((ico_detail: any) => {
        return _coin.ico_name
          .map((_ico_name: any) => _ico_name.ico_name)
          .reduce((pName: any, cName: any) => {
            if (ico_detail.ico_details?.includes(cName)) {
              pName[cName.replace('ICO', '').trim().toLowerCase().replace(' ', '_')] = ico_detail.ico_details
                .replace(cName, '')
                .trim();
            }
            return pName;
          }, {});
      }),
      deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: 'admin',
    };
  });

  fs.writeFileSync(`${__dirname}/data/coins_final.json`, JSON.stringify(coins));
  // coins = JSON.parse(JSON.stringify(coins).replace(/null/g, '""'));
  console.log('Inserting coins', coins.length);
  await db.collection('coins').insertMany(coins);
};
