import mongoDBLoader from '@/loaders/mongoDBLoader';
import { WorkType } from '@/types';
import fs from 'fs';
import peoplesFile from '../data/crypto_slate/json/peoples.json';
import InvestorAirtable from '../data/airtable/investor.json';
import AngelInvestorAirtable from '../data/airtable/Angel Investors.json';
import FundFounders from '../data/airtable/Funds - Founders.json';
import { createDataFile, readDataFromFile } from './utils';
import { $toObjectId, $countCollection } from '@/utils/mongoDB';
import Container from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDBLoader';
import slugify from 'slugify';
import { RemoveSlugPattern } from '@/types';

/* eslint-disable no-console */
export const PersonSeed = async () => {
  /* eslint-disable no-console */
  console.log('Running person seed');
  const db = Container.get(DIMongoDB);
  const collection = db.collection('persons');
  const count = await $countCollection({ collection });

  if (count) return;
  // const categories = await db.collection('categories').find({}).toArray();
  // const companies = await db.collection('companies').find({}).toArray();
  // const funds = await db.collection('funds').find({}).toArray();
  createDataFile({
    _collection: 'persons',
    _file: peoplesFile,
    _key: 'name',
  });
  const persons = (await Promise.all(
    readDataFromFile({ _collection: 'persons' }).map((_person: any) => {
      return {
        name:
          _person.verified != 'null' && _person.verified
            ? _person.name
                .replace(_person.verified.replace('Verified Social Credentials', ''), '')
                .replace('Verified', '')
                .trim()
            : _person.name.trim(),
        verified: !!_person.verified,
        about: _person.about,
        avatar: _person['avatar-src'],
        short_description: _person['short-description'],
        urls: {
          website: _person.website && _person.website[0] && [_person.website[0]['website-href']].filter(Boolean),
          telegram: _person.telegram && _person.telegram[0] && [_person.telegram[0]['telegram-href']].filter(Boolean),
          linkedin: _person.linkedin && _person.linkedin[0] && [_person.linkedin[0]['linkedin-href']].filter(Boolean),
          twitter: _person.twitter && _person.twitter[0] && [_person.twitter[0]['twitter-href']].filter(Boolean),
          discord: _person.discord && _person.discord[0] && [_person.discord[0]['discord-href']].filter(Boolean),
          gitter: _person.gitter && _person.gitter[0] && [_person.gitter[0]['gitter-href']].filter(Boolean),
          medium: _person.medium && _person.medium[0] && [_person.medium[0]['medium-href']].filter(Boolean),
          bitcoin_talk:
            _person.bitcoin_talk &&
            _person.bitcoin_talk[0] &&
            [_person.bitcoin_talk[0]['bitcointalk-href']].filter(Boolean),
          facebook: _person.facebook && _person.facebook[0] && [_person.facebook[0]['facebook-href']].filter(Boolean),
          youtube: _person.youtube && _person.youtube[0] && [_person.youtube[0]['youtube-href']].filter(Boolean),
          blog: _person.blog && _person.blog[0] && [_person.blog[0]['blog-href']].filter(Boolean),
          github: _person.github && _person.github[0] && [_person.github[0]['github-href']].filter(Boolean),
          reddit: _person.reddit && _person.reddit[0] && [_person.reddit[0]['reddit-href']].filter(Boolean),
          explorer: _person.explorer && _person.explorer[0] && [_person.explorer[0]['explorer-href']].filter(Boolean),
          stack_exchange:
            _person.stack_exchange &&
            _person.stack_exchange[0] &&
            [_person.stack_exchange[0]['stack-exchange-href']].filter(Boolean),
        },
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
    }),
  )) as any;

  const angelInvestors = (AngelInvestorAirtable as any).data.rows
    .map((person: any) => {
      const {
        cellValuesByColumnId: {
          fldjKwS1jKgY2myrS: location = [],
          fldj5t3yMdaLI3KtM: twitter = '',
          flduTkjX7gWZXGV9E: linkedin = '',
          fldJsLm2w5mTLnBuP: avatar = [],
          fldKYOWLOKiztp8zY: category,
          fldZYofoqxl8MMpit: company,
          fldyGkCKPKGZtfAPb: name = 'N/A',
          fldMXngpMRns0HfyZ: email = '',
        },
        id,
      } = person;
      return {
        id,
        name,
        location: location[0]?.foreignRowDisplayName || '',
        avatar: avatar[0]?.url || '',
        twitter,
        linkedin,
        company,
        email,
        categories: ['Angel Investor', category].filter(Boolean),
        type: 'persons',
      };
    })
    .map((item: any) => {
      const { id: foreign_id, ...rest } = item;
      return {
        foreign_id,
        ...rest,
      };
    });
  const investors = (InvestorAirtable as any).data.tableDatas[0].rows
    .map((investor: any) => {
      const {
        id,
        cellValuesByColumnId: {
          fldNJrXhATbXWYaPV: twitter,
          fldYxidGVWXbbBlvN: linkedin,
          fld2kiwtDqHbHa0bk: name,
          fldgBla8AxoEeCFU8: email = '',
          fldd6JgLkLn5Zi1QY: [{ url } = { url: '' }] = [],
        },
      } = investor;
      const type = angelInvestors.some((person: any) => person.name.toLowerCase() == name.toLowerCase())
        ? 'persons'
        : 'companies';
      return {
        id,
        name,
        twitter,
        linkedin,
        email,
        avatar: url,
        categories: ['investor'],
        type,
        need_review: type == 'companies',
      };
    })
    .map((item: any) => {
      const { id: foreign_id, ...rest } = item;
      return {
        foreign_id,
        ...rest,
      };
    })
    .reduce((acc: any, item: any) => {
      const { type } = item;
      acc[type] = [...(acc[type] || []), item];
      return acc;
    }, {});

  const fundfouders = (FundFounders as any).data.rows.map((person: any) => {
    const {
      id: foreign_id,
      cellValuesByColumnId: {
        fldqI6w9E04BIe2Ke: name = [],
        fldTsT4wtJYYxc6xN: twitter = '',
        fldIScO81Bpyu6Nfn: { valuesByForeignRowId: funds } = {
          valuesByForeignRowId: {},
        },
      },
    } = person;
    return {
      name,
      foreign_id,
      twitter,
      funds: Object.values(funds || {}).flatMap((fund: any) => {
        return fund.map(
          ({ foreignRowDisplayName, foreignRowId }: { foreignRowDisplayName: string; foreignRowId: string }) => {
            return {
              name: foreignRowDisplayName,
              foreign_id: foreignRowId,
            };
          },
        );
      }),
    };
  });
  const persons_final = await Promise.all(
    Object.values(
      [...persons, ...angelInvestors, ...investors.persons, ...fundfouders].reduce((current: any, item: any) => {
        const { name, ...rest } = item;
        // const lowerName = name
        //   .replace(/[\W_]+/g, ' ')
        //   .replace(/  +/g, ' ')
        //   .toLowerCase()
        //   .trim();
        const lowerName = slugify(name.trim(), {
          lower: true,
          strict: true,
          replacement: ' ',
          remove: RemoveSlugPattern,
        });
        // console.log(name);
        return {
          ...current,
          [lowerName]: {
            ...((current[lowerName] && {
              ...Object.keys({ ...rest, ...current[lowerName] }).reduce((acc: any, key: any) => {
                if (
                  !!current[lowerName][key] ||
                  (Array.isArray(current[lowerName][key]) && current[lowerName][key].length)
                ) {
                  if (Array.isArray(current[lowerName][key])) {
                    if (Array.isArray(rest[key])) {
                      acc[key] = [...current[lowerName][key], ...rest[key]];
                      delete rest[key];
                    } else {
                      acc[key] = [...current[lowerName][key]];
                    }
                  } else {
                    acc[key] = current[lowerName][key];
                  }
                } else {
                  if (Array.isArray(rest[key])) {
                    acc[key] = [...rest[key]];
                  } else {
                    acc[key] = rest[key];
                  }
                  delete rest[key];
                }
                if (acc[key] == rest[key]) {
                  delete rest[key];
                }
                return acc;
              }, {}),
              metadata: {
                storage: [
                  ...(current[lowerName].metadata.storage || []),
                  {
                    ...rest,
                  },
                ],
              },
            }) || { ...item, metadata: {} }),
          },
        };
      }, {}),
    )
      .map(
        ({
          foreign_id = null,
          need_review = false,
          reviewed = false,
          about = '',
          short_description = '',
          avatar = '',
          educations = [],
          works = [],
          categories = [],
          location = '',
          email = '',
          type,
          name,
          metadata = {},
          ...rest
        }: any) => {
          return {
            ...rest,
            // name: name
            //   .replace(/[\W_]+/g, ' ')
            //   .replace(/  +/g, ' ')
            //   .trim(),
            name: slugify(name.trim(), {
              lower: true,
              strict: true,
              replacement: ' ',
              remove: RemoveSlugPattern,
            }),
            foreign_id,
            categories: [...new Set(categories)],
            about,
            short_description,
            avatar,
            educations,
            works,
            location,
            email,
            metadata,
            reviewed,
            need_review,
            trans: [] as any,
            deleted: false,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: 'admin',
          };
        },
      )
      .map(async (item: any, index, items: any[]) => {
        const foreign_ids = [
          ...new Set([
            item.foreign_id,
            ...((item?.metadata?.storage || []).map((item: any) => item?.foreign_id) as []),
          ]),
        ].filter(Boolean);
        return {
          ...item,
          foreign_ids,
        };
      }),
  );
  console.log('Inserting persons', {
    angelInvestors: angelInvestors.length,
    investors_persons: investors.persons.length,
    investors_companies: investors.companies.length,
    // mergeInvertors: mergeInvertors.length,
    fundfouders: fundfouders.length,
    persons: persons.length,
    final: persons_final.length,
    dupticate:
      persons_final.length - (persons.length + angelInvestors.length + investors.persons.length + fundfouders.length),
  });
  // fs.writeFileSync(`${__dirname}/data/persons.json`, JSON.stringify(persons).replace(/null/g, '""'));
  // fs.writeFileSync(
  //   `${__dirname}/data/angel_investors_airtable.json`,
  //   JSON.stringify(angelInvestors).replace(/null/g, '""'),
  // );
  // fs.writeFileSync(`${__dirname}/data/investors_airtable.json`, JSON.stringify(investors).replace(/null/g, '""'));
  // fs.writeFileSync(
  //   `${__dirname}/data/merge_investors_airtable.json`,
  //   JSON.stringify(mergeInvertors).replace(/null/g, '""'),
  // );
  // fs.writeFileSync(`${__dirname}/data/fund_founders.json`, JSON.stringify(fundfouders).replace(/null/g, '""'));
  fs.writeFileSync(`${__dirname}/data/persons_final.json`, JSON.stringify(persons_final));
  // await db.collection('persons').insertMany(persons_final);
  return persons_final;
};
export const personInvestment = async () => {
  const companies = JSON.parse(fs.readFileSync(`${__dirname}/data/companies_final.json`, 'utf8') as any);
  const funds = JSON.parse(fs.readFileSync(`${__dirname}/data/funds.json`, 'utf8') as any);
  const persons = JSON.parse(fs.readFileSync(`${__dirname}/data/persons_final.json`, 'utf8') as any);
  const db = Container.get(DIMongoDB);
  const personsFinal = persons.map(({ foreign_id, foreign_ids = [], name, ...rest }: any) => {
    const investments = [
      ...(companies as any)
        .filter(
          ({ investors = [], ...rest }: any) =>
            investors.some(
              ({ foreign_id: investor_id, name: investor_name }: any) =>
                investor_id == foreign_id ||
                foreign_ids.includes(investor_id) ||
                name
                  .toLowerCase()
                  .includes(investor_name.toLowerCase() || investor_name.toLowerCase() == name.toLowerCase()),
            ) && rest.foreign_id,
        )
        .map(({ foreign_id, name: investor_name }: any) => ({
          foreign_id,
          name: investor_name,
          type: 'company',
        }))
        .filter((_item: any, index: any, items: any) => {
          return index == items.findIndex((item: any) => item.foreign_id == _item.foreign_id);
        }),
      ...(funds as any)
        .filter(
          ({ investors = [], ...rest }: any) =>
            investors.some(
              ({ foreign_id: investor_id, name: investor_name }: any) =>
                investor_id == foreign_id ||
                foreign_ids.includes(investor_id) ||
                name
                  .toLowerCase()
                  .includes(investor_name.toLowerCase() || investor_name.toLowerCase() == name.toLowerCase()),
            ) && rest.foreign_id,
        )
        .map(({ foreign_id, name: investor_name }: any) => ({
          foreign_id,
          name: investor_name,
          type: 'funds',
        }))
        .filter((_item: any, index: any, items: any) => {
          return index == items.findIndex((item: any) => item.foreign_id == _item.foreign_id);
        }),
    ];
    return {
      name,
      ...rest,
      foreign_id,
      investments,
      total_investments: investments.length,
    };
  });
  fs.writeFileSync(`${__dirname}/data/_persons.json`, JSON.stringify(personsFinal));
};
export const insertPersons = async () => {
  const db = Container.get(DIMongoDB);
  const count = await db.collection('persons').countDocuments();
  if (count) return;
  console.log('Inserting persons');
  const categories = await db.collection('categories').find({}).toArray();
  const personsFinal = await Promise.all(
    JSON.parse(fs.readFileSync(`${__dirname}/data/_persons.json`, 'utf8') as any).map(async (item: any) => {
      return {
        ...item,
        slug: slugify(item.name, { lower: true, trim: true, remove: RemoveSlugPattern }),
        categories: await Promise.all(
          item.categories
            .filter(Boolean)
            .filter(
              (item: any, index: any, items: any) =>
                items.findIndex((item2: any) => item2.toLowerCase() == item.toLowerCase()) == index,
            )
            .map(async (_category: any): Promise<any> => {
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
                          .replaceAll(' ', '_'),
                        $options: 'i',
                      },
                    },
                    {
                      $setOnInsert: {
                        title: _category,
                        type: 'company',
                        name: _category
                          .toLowerCase()
                          .match(/[a-zA-Z0-9_ ]+/g)
                          .join('')
                          .trim()
                          .replaceAll(' ', '_'),
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
        metadata: {
          ...item.metadata,
          storage: await Promise.all(
            item.metadata?.storage?.map(async (storage: any) => {
              return {
                ...storage,
                categories: await Promise.all(
                  storage.categories
                    ?.filter(Boolean)
                    .filter(
                      (item: any, index: any, items: any) =>
                        items.findIndex((item2: any) => item2.toLowerCase() == item.toLowerCase()) == index,
                    )
                    .map(async (_category: any): Promise<any> => {
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
                                  .replaceAll(' ', '_'),
                                $options: 'i',
                              },
                            },
                            {
                              $setOnInsert: {
                                title: _category,
                                type: 'company',
                                name: _category
                                  .toLowerCase()
                                  .match(/[a-zA-Z0-9_ ]+/g)
                                  .join('')
                                  .trim()
                                  .replaceAll(' ', '_'),
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
                              },
                            },
                            {
                              upsert: true,
                              returnDocument: 'after',
                            },
                          )
                        ).value._id
                      );
                    }) || [],
                ),
              };
            }) || [],
          ),
        },
      };
    }),
  );
  await db.collection('persons').insertMany(personsFinal);
  console.log('inserted persons', personsFinal.length);
};
