import mongoDBLoader from '@/loaders/mongoDBLoader';
// import crypto_company from '../data/crypto_slate/json/crypto_company.json';
// import company_feature from '../data/crypto_slate/json/company_feature.json';
// import company_gallery from '../data/crypto_slate/json/company_gallery.json';
// import company_ccy from '../data/crypto_slate/json/company_ccy.json';
// import company_team from '../data/crypto_slate/json/company_team.json';
// import company_portfolio from '../data/crypto_slate/json/company_portfolio.json';
// import company_sector from '../data/crypto_slate/json/company_sector.json';
// import company_product from '../data/crypto_slate/json/company_product.json';
// import company_support from '../data/crypto_slate/json/company_support.json';
// import { $toObjectId, $countCollection } from '@/utils/mongoDB';
import companiesFile from '../data/crypto_slate/json/companies.json';
import fs from 'fs';
import { createDataFile, readDataFromFile } from './utils';

// export const CompanySeed = async () => {
//   /* eslint-disable no-console */

//   const db = await mongoDBLoader();
//   const collection = db.collection('companies');
//   const count = await $countCollection({ collection });
//   if (!count) {
//     const categories = await db.collection('categories').find({}).toArray();
//     const sectors = await db
//       .collection('categories')
//       .find({
//         type: 'sector',
//       })
//       .toArray();
//     const products = await db.collection('products').find({}).toArray();
//     const companies = [];
//     companies.push(
//       ...crypto_company.map((_company) => {
//         const {
//           name,
//           director,
//           headquarter,
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
//         } = _company;
//         return {
//           name,
//           director,
//           headquarter,
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
//           galleries: company_gallery
//             .filter((gallery) => gallery.company_name == name)
//             .map((gallery) => {
//               return {
//                 url: gallery.gallery,
//               };
//             }),
//           ccys: company_ccy
//             .filter((ccy) => ccy.company_name == name)
//             .map((ccy) => {
//               return ccy.ccy;
//             }),
//           features: company_feature
//             .filter((feature) => feature.company_name == name)
//             .map((feature) => {
//               return feature.feature;
//             }),
//           team: company_team
//             .filter((team) => team.company_name == name)
//             .map((team) => {
//               return team.team;
//             }),
//           portfolios: company_portfolio
//             .filter((portfolio) => portfolio.company_name == name)
//             .map((company) => {
//               return company.portfolio;
//             }),
//           categories: $toObjectId(
//             company_sector
//               .filter((company) => company.company_name == name)
//               .map((sector) => {
//                 return sectors.find((_sector) => {
//                   return _sector.title == sector.sector;
//                 })?._id;
//               }),
//           ),
//           supports: company_support
//             .filter((support) => support.company_name == name)
//             .map((support) => {
//               return support.support;
//             }),
//           products: $toObjectId(
//             company_product
//               .filter((company) => company.company_name == name)
//               .map((product) => {
//                 return products.find((_product) => {
//                   return _product.name == product.product;
//                 })?._id;
//               }),
//           ),
//           deleted: false,
//           crypto_currencies: [],
//           projects: [],
//           created_at: new Date(),
//           updated_at: new Date(),
//           created_by: 'admin',
//         };
//       }),
//     );
//     // console.log(companies.find((company) => company.products.length > 1));

//     console.log('Running companies seed');
//     console.log('Inserting companies', companies.length);
//     await collection.insertMany(companies);
//   }
// };
export const CompanySeed = async () => {
  /* eslint-disable no-console */
  createDataFile({
    _collection: 'companies',
    _file: companiesFile,
    _key: 'name',
  });
  const db = await mongoDBLoader();
  let companies = readDataFromFile({ _collection: 'companies' }).map((_company: any) => {
    return {
      deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: 'admin',
      name:
        _company.verified != 'null' && _company.verified
          ? _company.name
              .replace(_company.verified.replace('Verified Social Credentials', ''), '')
              .replace('Verified', '')
              .trim()
          : _company.name,
      verified: !!_company.verified,
      about: _company.about,
      video: _company.video,
      headquarter: _company['headquarters'],
      avatar: _company['avatar-src'],
      website: _company['website-href'] || '',
      telegram: (_company.telegram && _company.telegram[0] && _company.telegram[0]['telegram-href']) || '',
      linkedin: (_company.linkedin && _company.linkedin[0] && _company.linkedin[0]['linkedin-href']) || '',
      twitter: (_company.twitter && _company.twitter[0] && _company.twitter[0]['twitter-href']) || '',
      discord: (_company.discord && _company.discord[0] && _company.discord[0]['discord-href']) || '',
      gitter: (_company.gitter && _company.gitter[0] && _company.gitter[0]['gitter-href']) || '',
      medium: (_company.medium && _company.medium[0] && _company.medium[0]['medium-href']) || '',
      bitcoin_talk:
        (_company.bitcoin_talk && _company.bitcoin_talk[0] && _company.bitcoin_talk[0]['bitcointalk-href']) || '',
      facebook: (_company.facebook && _company.facebook[0] && _company.facebook[0]['facebook-href']) || '',
      youtube: (_company.youtube && _company.youtube[0] && _company.youtube[0]['youtube-href']) || '',
      blog: (_company.blog && _company.blog[0] && _company.blog[0]['blog-href']) || '',
      github: (_company.github && _company.github[0] && _company.github[0]['github-href']) || '',
      reddit: (_company.reddit && _company.reddit[0] && _company.reddit[0]['reddit-href']) || '',
      explorer: _company['explorer-href'] || '',
      stack_exchange:
        (_company.stack_exchange && _company.stack_exchange[0] && _company.stack_exchange[0]['stack-exchange-href']) ||
        '',
      whitepaper: _company['whitepaper-href'] || '',
      short_description: _company['short-description'],
      location: _company.location && _company.location[0] && _company.location[0]['location-href'],
      services: _company.services.map((service: any) => service.services),
      supports: _company.supports.map((support: any) => {
        return {
          name: support.supports,
          url: support['supports-href'],
        };
      }),
      categories: _company.tags.map((category: any) => category.tags) || [],
      products: _company.products.map((product: any) => product.products),
      research_papers: _company.research_papers.map((paper: any) => {
        return {
          title: paper.research_papers,
          url: paper['research_papers-href'],
        };
      }),
      team: _company.team_person_name.map((person_name: any) => {
        const personIndex = _company.person_detail.findIndex(
          (person: any) => person.person_detail == person_name.team_person_name,
        );
        const person = _company.persons.find((_person: any) =>
          _person.persons.includes(person_name.team_person_name),
        ).persons;
        const personTwitter = _company.person_twitter.find(
          (person_twitter: any) =>
            person && person.includes(person_twitter.person_twitter) && person_twitter.person_twitter,
        );
        const personGithub = _company.person_github.find(
          (person_github: any) => person && person.includes(person_github.person_github) && person_github.person_github,
        );
        const personLinkedin = _company.person_linkedin.find(
          (person_linkedin: any) =>
            person && person.includes(person_linkedin.person_linkedin) && person_linkedin.person_linkedin,
        );
        if (personTwitter) {
          const foundIndex = _company.person_twitter.findIndex(
            (person_twitter: any) =>
              person && person.includes(person_twitter.person_twitter) && person_twitter.person_twitter,
          );
          if (foundIndex > -1) {
            _company.person_twitter.splice(foundIndex, 1);
          }
        }
        if (personGithub) {
          const foundIndex = _company.person_github.findIndex(
            (person_github: any) =>
              person && person.includes(person_github.person_github) && person_github.person_github,
          );
          if (foundIndex > -1) {
            _company.person_github.splice(foundIndex, 1);
          }
        }
        if (personLinkedin) {
          const foundIndex = _company.person_linkedin.findIndex(
            (person_linkedin: any) =>
              person && person.includes(person_linkedin.person_linkedin) && person_linkedin.person_linkedin,
          );
          if (foundIndex > -1) {
            _company.person_linkedin.splice(foundIndex, 1);
          }
        }
        return {
          name: person_name.team_person_name,
          position: _company.person_detail[personIndex + 1].person_detail,
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
      cryptocurrencies: _company.cryptocurrencies.map(
        (cryptocurrency: any) => cryptocurrency['cryptocurrencies-title'],
      ),
      clients: _company.clients.map((client: any) => client['clients-title']),
      portfolios: _company.portfolio.map((portfolio: any) => portfolio['portfolio-title']),
      galleries: _company.gallery.map((gallery: any) => gallery['gallery-src']),
    };
  });
  companies = JSON.parse(JSON.stringify(companies).replace(/null/g, '""'));
  console.log('Inserting companies', companies.length);
  fs.writeFileSync(`${__dirname}/data/companies_final.json`, JSON.stringify(companies).replace(/null/g, '""'));
  // await db.collection('companies').insertMany(companies);
};
