// import mongoDBLoader from '@/loaders/mongoDBLoader';
// import { WorkType } from '@/types/Common';
// import { $toObjectId, $countCollection } from '@/utils/mongoDB';
// import crypto_peoples from '../data/crypto_slate/json/crypto_people.json';
// import people_previous_work from '../data/crypto_slate/json/people_previous_work.json';
// import people_current_work from '../data/crypto_slate/json/people_current_work.json';
// import people_education from '../data/crypto_slate/json/people_education.json';
// /* eslint-disable no-console */
// export const PersonSeed = async () => {
//   console.log('Running person seed');
//   const db = await mongoDBLoader();
//   const collection = db.collection('persons');
//   const count = await $countCollection({ collection });
//   if (!count) {
//     const peoples = [];
//     peoples.push(
//       ...crypto_peoples.map((person) => {
//         return {
//           name: person.name,
//           position: person.position,
//           avatar: person.avatar,
//           blog: person.blog,
//           twitter: person.twitter,
//           facebook: person.facebook,
//           linkedin: person.linkedin,
//           instagram: person.instagram,
//           youtube: person.youtube,
//           telegram: person.telegram,
//           website: person.website,
//           about: person.about,
//           medium: person.medium,
//           reddit: person.reddit,
//           deleted: false,
//           created_at: new Date(),
//           updated_at: new Date(),
//           created_by: 'admin',
//           categories: [],
//           works: [
//             ...people_previous_work
//               .filter((work) => {
//                 return work.person_name === person.name;
//               })
//               .map((work) => {
//                 return {
//                   title: work.work,
//                   type: WorkType.PREVIOUS,
//                 };
//               }),
//             ...people_current_work
//               .filter((work) => {
//                 return work.person_name === person.name;
//               })
//               .map((work) => {
//                 return {
//                   title: work.work,
//                   type: WorkType.CURRENT,
//                 };
//               }),
//           ],
//           educations: [
//             ...people_education
//               .filter((education) => {
//                 return education.person_name === person.name;
//               })
//               .map((education) => {
//                 return {
//                   title: education.education,
//                 };
//               }),
//           ],
//         };
//       }),
//     );

//     console.log('Inserting persons', peoples.length);
//     await collection.insertMany(peoples);
//   }
// };
import mongoDBLoader from '@/loaders/mongoDBLoader';
import { WorkType } from '@/types';
import fs from 'fs';
import peoplesFile from '../data/crypto_slate/json/peoples.json';
import { createDataFile, readDataFromFile } from './utils';

/* eslint-disable no-console */
export const PersonSeed = async () => {
  const db = await mongoDBLoader();
  /* eslint-disable no-console */
  createDataFile({
    _collection: 'persons',
    _file: peoplesFile,
    _key: 'name',
  });
  const persons = readDataFromFile({ _collection: 'persons' }).map((_person: any) => {
    return {
      deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: 'admin',
      name:
        _person.verified != 'null' && _person.verified
          ? _person.name
              .replace(_person.verified.replace('Verified Social Credentials', ''), '')
              .replace('Verified', '')
          : _person.name,
      verified: !!_person.verified,
      about: _person.about,
      avatar: _person['avatar-src'],
      short_description: _person['short-description'],
      website: (_person.website && _person.website[0] && _person.website[0]['website-href']) || '',
      telegram: (_person.telegram && _person.telegram[0] && _person.telegram[0]['telegram-href']) || '',
      linkedin: (_person.linkedin && _person.linkedin[0] && _person.linkedin[0]['linkedin-href']) || '',
      twitter: (_person.twitter && _person.twitter[0] && _person.twitter[0]['twitter-href']) || '',
      discord: (_person.discord && _person.discord[0] && _person.discord[0]['discord-href']) || '',
      gitter: (_person.gitter && _person.gitter[0] && _person.gitter[0]['gitter-href']) || '',
      medium: (_person.medium && _person.medium[0] && _person.medium[0]['medium-href']) || '',
      bitcoin_talk:
        (_person.bitcoin_talk && _person.bitcoin_talk[0] && _person.bitcoin_talk[0]['bitcointalk-href']) || '',
      facebook: (_person.facebook && _person.facebook[0] && _person.facebook[0]['facebook-href']) || '',
      youtube: (_person.youtube && _person.youtube[0] && _person.youtube[0]['youtube-href']) || '',
      blog: (_person.blog && _person.blog[0] && _person.blog[0]['blog-href']) || '',
      github: (_person.github && _person.github[0] && _person.github[0]['github-href']) || '',
      reddit: (_person.reddit && _person.reddit[0] && _person.reddit[0]['reddit-href']) || '',
      explorer: (_person.explorer && _person.explorer[0] && _person.explorer[0]['explorer-href']) || '',
      stack_exchange:
        (_person.stack_exchange && _person.stack_exchange[0] && _person.stack_exchange[0]['stack-exchange-href']) || '',
      categories: _person.tags.map((category: any) => category.tags) || [],
      educations: _person.educations.map((education: any) => education.educations) || [],
      works: [
        ..._person.current_works.map((work: any) => {
          const position = _person.current_works_position.find((position: any) => {
            return work['current_works'].includes(position.current_works_position);
          })?.current_works_position;
          const name = _person.current_work_names.find((position: any) => {
            return work['current_works'].includes(position.current_work_names);
          })?.current_work_names;
          return {
            company: name,
            position: position,
            type: WorkType.CURRENT,
          };
        }),
        ..._person.previous_works.map((work: any) => {
          const position = _person.previous_works_position.find((position: any) => {
            return work['previous_works'].includes(position.previous_works_position);
          })?.previous_works_position;
          const name = _person.previous_work_names.find((position: any) => {
            return work['previous_works'].includes(position.previous_work_names);
          })?.previous_work_names;
          const period = _person.previous_works_date.find((position: any) => {
            return work['previous_works'].includes(position.previous_works_date);
          })?.previous_works_date;
          return {
            company: name,
            position: position,
            type: WorkType.PREVIOUS,
            period: period,
          };
        }),
      ],
    };
  });
  console.log('Inserting persons', persons.length);
  fs.writeFileSync(`${__dirname}/data/persons_final.json`, JSON.stringify(persons).replace(/null/g, '""'));
  await db.collection('persons').insertMany(persons);
};
