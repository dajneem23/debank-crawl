import mongoDBLoader from '@/loaders/mongoDBLoader';
import { $toObjectId, $countCollection } from '@/utils/mongoDB';
import companiesFile from '../data/crypto_slate/json/companies.json';
import cryptoCompaniesFile from '../data/airtable/Crypto Companies.json';
import fundraisingRoundsFile from '../data/airtable/Fundraising Rounds - Companies.json';
import InvestorAirtable from '../data/airtable/investor.json';
import AngelInvestorAirtable from '../data/airtable/Angel Investors.json';
import fs from 'fs';
import { createDataFile, readDataFromFile } from './utils';
/* eslint-disable no-console */
export const CompanySeed = async () => {
  createDataFile({
    _collection: 'companies',
    _file: companiesFile,
    _key: 'name',
  });
  const db = await mongoDBLoader();
  const collection = db.collection('companies');
  const count = await $countCollection({ collection });
  const categories = await db.collection('categories').find({}).toArray();
  if (count) return;
  const companies = readDataFromFile({ _collection: 'companies' }).map((_company: any) => {
    return {
      name:
        _company.verified != 'null' && _company.verified
          ? _company.name
              .replace(_company.verified.replace('Verified Social Credentials', ''), '')
              .replace('Verified', '')
              .trim()
          : _company.name.trim(),
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

  const airtableCompanies = (cryptoCompaniesFile as any).data.rows
    .reduce((companies: any, row: any) => {
      const {
        cellValuesByColumnId: {
          fldYopilw6pRY334s: name,
          fldQG6489r2BIckRi,
          fldfxvX3xyd1uBTM4: twitter,
          fldXIqyTI8vVF00vs,
          fldiL1KEOZO4MHcvW,
          fldYaVxLsnQ8BsaR2: year_founded,
          fldcS8EC1HmIuKx7k,
          fldysc8lKcZcuCWt6,
          fldbGZmPcgWw1UomW: founders,
          fld9wtb94DoZO3bHI: company_investors,
          fldiHg3cVQbfR2FRq,
          flddkP6oXlI26fizf,
          fldfmA70dMP31b9Rq: total_amount,
          fldRX4OjNm9Ul1Dyp,
          fldFSvhqgXnNA8Llz,
        },
        id,
      } = row;
      const fldQG6489r2BIckRi_Key = fldQG6489r2BIckRi?.includes('discord') ? 'discord' : 'telegram' || 'telegram';
      const websites = fldiL1KEOZO4MHcvW
        ? Object.values(fldiL1KEOZO4MHcvW.valuesByForeignRowId).filter(
            (website: any, index: any, self: any) => index === self.findIndex((t: any) => t === website),
          )
        : [];
      const companyLocations = fldcS8EC1HmIuKx7k?.map((location: any) => location.foreignRowDisplayName) || [];
      const about = Object.values(fldysc8lKcZcuCWt6?.valuesByForeignRowId || {})
        .filter((about: any, index: any, self: any) => index === self.findIndex((t: any) => t === about))
        .join('.\n');
      const fundraising_rounds =
        fldiHg3cVQbfR2FRq?.map((item: any) => {
          const {
            cellValuesByColumnId: { fldjd43zfXdpAWzaq = [], fldT0Fasv4hkjwbb3 = [], fldruqJ51OKbiswEI: projects = [] },
          } = (fundraisingRoundsFile as any).data.rows.find((round: any) => round.id == item.foreignRowId);
          return {
            round_id: item.foreignRowId,
            stage: item.foreignRowDisplayName.split('-').at(-1).trim(),
            round_name: item.foreignRowDisplayName,
            amount: fldRX4OjNm9Ul1Dyp?.valuesByForeignRowId[item.foreignRowId] || 0,
            categories: [
              ...fldjd43zfXdpAWzaq.map((item: any) => item.foreignRowDisplayName),
              ...fldT0Fasv4hkjwbb3.map((item: any) => item.foreignRowDisplayName),
            ],
            projects: projects.map((item: any) => {
              return {
                foreign_id: item.foreignRowId,
                name: item.foreignRowDisplayName,
              };
            }),
          };
        }) || [];
      const fundraising_rounds_ids = fundraising_rounds.map((item: any) => item.round_id);
      return [
        ...companies,
        {
          name,
          id,
          about,
          total_amount,
          twitter,
          [fldQG6489r2BIckRi_Key]: fldQG6489r2BIckRi,
          [fldQG6489r2BIckRi_Key == 'discord' ? 'telegram' : 'discord']: '',
          avatar: fldXIqyTI8vVF00vs ? fldXIqyTI8vVF00vs[0].url : '',
          websites,
          website: websites[0],
          year_founded,
          // locations: companyLocations,
          location: companyLocations[0],
          founders: Object.keys(founders?.valuesByForeignRowId || {})
            .reduce((current: any, key: any) => {
              return [
                ...current,
                ...founders?.valuesByForeignRowId[key].map((investor: any) => {
                  return {
                    round_id: key,
                    rounds: [key] as string[],
                    foreign_id: investor.foreignRowId,
                    name: investor.foreignRowDisplayName,
                  };
                }),
              ];
            }, [])
            .reduce((acc: any, current: any) => {
              if (acc.some((item: any) => item.name === current.name)) {
                const item = acc.find((item: any) => item.name === current.name);
                item.rounds = [...item.rounds, current.round_id];
                return acc;
              }
              return [...acc, current];
            }, []),
          investors: [
            ...(fldFSvhqgXnNA8Llz?.map((investor: any) => {
              return {
                type: 'persons',
                foreign_id: investor.foreignRowId,
                name: investor.foreignRowDisplayName,
              };
            }) || []),
            ...[
              ...(fundraisingRoundsFile as any).data.rows
                .filter((round: any) => {
                  return fundraising_rounds_ids.includes(round.id);
                })
                .reduce((current: any, round: any) => {
                  return [
                    ...current,
                    ...(round.cellValuesByColumnId.fldhntVnAppLIOUAl?.map((item: any) => {
                      return {
                        type: 'companies',
                        round_id: round.id,
                        foreign_id: item.foreignRowId,
                        name: item.foreignRowDisplayName,
                        rounds: [round.id],
                      };
                    }) || []),
                  ];
                }, []),
              ...(company_investors?.map((item: any) => {
                return {
                  type: 'companies',
                  foreign_id: item.foreignRowId,
                  name: item.foreignRowDisplayName,
                };
              }) || []),
            ]
              .reduce((current: any, item: any) => {
                if (!current.find((i: any) => i.foreign_id === item.foreign_id)) {
                  return [...current, item];
                } else {
                  return current;
                }
              }, [])
              .reduce((acc: any, current: any) => {
                if (acc.some((item: any) => item.name === current.name) && current.round_id) {
                  const item = acc.find((item: any) => item.name === current.name);
                  item.rounds = [...item.rounds, current.round_id];
                  return acc;
                }
                return [...acc, current];
              }, []),
          ],
          cryptocurrencies: Object.keys(flddkP6oXlI26fizf?.valuesByForeignRowId || {}).map((key: any) => {
            return {
              foreign_id: key,
              name: flddkP6oXlI26fizf?.valuesByForeignRowId[key],
            };
          }),
          fundraising_rounds: fundraising_rounds.map((item: any) => {
            const { categories, ...rest } = item;
            return rest;
          }),
          categories: fundraising_rounds
            .map((item: any) => {
              return item.categories;
            })
            .flat()
            .filter((item: any, index: any, self: any) => index === self.findIndex((t: any) => t === item)),
        },
      ];
    }, [])
    .filter(Boolean)
    .map((item: any) => {
      const { id: foreign_id, ...rest } = item;
      return {
        foreign_id,
        ...rest,
      };
    });
  // const airtableUniqueCompanies = airtableCompanies.filter(
  //   (company: any, index: any, self: any) => index === self.findIndex((t: any) => t.name === company.name),
  // );
  const angelInvestors = await Promise.all(
    (AngelInvestorAirtable as any).data.rows
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
          categories: [category].filter(Boolean),
          type: 'persons',
        };
      })
      .map(async (item: any) => {
        const { id: foreign_id, ...rest } = item;
        return {
          foreign_id,
          ...rest,
        };
      }),
  );
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
        categories: ['Investor'],
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

  const companies_final = await Promise.all(
    Object.values(
      [...airtableCompanies, ...companies, ...investors.companies].reduce((current: any, item: any) => {
        const { name, ...rest } = item;
        const lowerName = name.toLowerCase().trim();
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
      .map((item: any) => {
        const {
          foreign_id = null,
          need_review = false,
          reviewed = false,
          year_founded = 0,
          total_amount = 0,
          websites = [],
          founders = [],
          investors = [],
          metadata = {},
          fundraising_rounds = [],
          services = [],
          supports = [],
          team = [],
          research_papers = [],
          products = [],
          clients = [],
          portfolios = [],
          galleries = [],
          categories = [],
          about = '',
          verified = false,
          headquarter = '',
          facebook = '',
          twitter = '',
          medium = '',
          discord = '',
          linkedin = '',
          youtube = '',
          gitter = '',
          whitepaper = '',
          stack_exchange = '',
          telegram = '',
          location = '',
          short_description = '',
          github = '',
          reddit = '',
          explorer = '',
          partners = [],
          cryptocurrencies = [],
          firms = [],
          avatars = [],
          projects = [],
          type,
          ...rest
        } = item;
        return {
          ...rest,
          foreign_id,
          categories: [...new Set(categories)],
          year_founded,
          avatars,
          websites,
          total_amount,
          founders,
          investors,
          fundraising_rounds,
          services,
          supports,
          team,
          research_papers,
          products,
          clients,
          portfolios,
          partners,
          galleries,
          about,
          verified,
          headquarter,
          facebook,
          twitter,
          medium,
          discord,
          linkedin,
          youtube,
          gitter,
          whitepaper,
          stack_exchange,
          telegram,
          location,
          short_description,
          github,
          reddit,
          explorer,
          cryptocurrencies,
          firms,
          metadata,
          need_review,
          reviewed,
          projects,
          trans: [] as any,
          deleted: false,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: 'admin',
        };
      })
      .map(async (item: any, index, items: any[]) => {
        const foreign_ids = [
          ...new Set([
            item.foreign_id,
            ...((item?.metadata?.storage || []).map((item: any) => item?.foreign_id) as []),
          ]),
        ].filter(Boolean);

        return {
          ...item,
          categories: await Promise.all(
            item.categories.filter(Boolean).map(async (_category: any): Promise<any> => {
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
                        type: 'person',
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
          metadata: {
            ...item.metadata,
            storage: await Promise.all(
              item.metadata?.storage?.map(async (storage: any) => {
                return {
                  ...storage,
                  categories: await Promise.all(
                    storage.categories?.filter(Boolean)?.map(async (_category: any): Promise<any> => {
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
                                type: 'company',
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
          total_investments: items.reduce((_total: any, _item: any) => {
            return (
              _total +
              _item.investors?.reduce(
                (total: any, investor: any) => total + foreign_ids.includes(investor.foreign_id),
                0,
              )
            );
          }, 0),
          investments: items.reduce((_total: any, _item: any) => {
            return [
              ..._total,
              ..._item.investors?.reduce(
                (total: any, investor: any) => [
                  ...total,
                  ...(foreign_ids.includes(investor.foreign_id) ? [_item.foreign_id] : []),
                ],
                [],
              ),
            ];
          }, []),
          foreign_ids,
        };
      }),
  );

  console.log('Inserting companies', {
    companies: companies.length,
    investors: investors.companies.length,
    airtableCompanies: airtableCompanies.length,
    dupticate: companies.length + investors.companies.length + airtableCompanies.length - companies_final.length,
    final: companies_final.length,
    // airtableUniqueCompanies: airtableUniqueCompanies.length,
    total: companies_final.some((c: any) => c.total_investments),
  });
  // fs.writeFileSync(
  //   `${__dirname}/data/companies_airtable.json`,
  //   JSON.stringify(airtableCompanies).replace(/null/g, '""'),
  // );
  // fs.writeFileSync(`${__dirname}/data/companies.json`, JSON.stringify(companies).replace(/null/g, '""'));
  // fs.writeFileSync(`${__dirname}/data/companies_final.json`, JSON.stringify(companies_final));
  await db.collection('companies').insertMany(companies_final);
};
