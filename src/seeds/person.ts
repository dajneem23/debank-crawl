import mongoDBLoader from '@/loaders/mongoDBLoader';
import { WorkType } from '@/types';
import fs from 'fs';
import peoplesFile from '../data/crypto_slate/json/peoples.json';
import { createDataFile, readDataFromFile } from './utils';
import { $toObjectId, $countCollection } from '@/utils/mongoDB';
/* eslint-disable no-console */
export const PersonSeed = async () => {
  /* eslint-disable no-console */
  console.log('Running person seed');
  const db = await mongoDBLoader();
  const collection = db.collection('persons');
  const count = await $countCollection({ collection });
  const categories = await db.collection('categories').find({}).toArray();

  if (!count) {
    createDataFile({
      _collection: 'persons',
      _file: peoplesFile,
      _key: 'name',
    });
    const persons = await Promise.all(
      readDataFromFile({ _collection: 'persons' })
        .map((_person: any) => {
          return {
            trans: [] as any,
            deleted: false,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: 'admin',
            name:
              _person.verified != 'null' && _person.verified
                ? _person.name
                    .replace(_person.verified.replace('Verified Social Credentials', ''), '')
                    .replace('Verified', '')
                : _person.name.trim(),
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
              (_person.stack_exchange &&
                _person.stack_exchange[0] &&
                _person.stack_exchange[0]['stack-exchange-href']) ||
              '',
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
                          trans: [],
                          sub_categories: [],
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
    console.log('Inserting persons', persons.length);
    fs.writeFileSync(`${__dirname}/data/persons_final.json`, JSON.stringify(persons).replace(/null/g, '""'));
    await db.collection('persons').insertMany(persons);
  }
};
