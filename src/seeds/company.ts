import { $countCollection } from '@/utils/mongoDB';
import companiesFile from '../data/crypto_slate/json/companies.json';
import cryptoCompaniesFile from '../data/airtable/Crypto Companies.json';
import fundraisingRoundsFile from '../data/airtable/Fundraising Rounds - Companies.json';
import InvestorAirtable from '../data/airtable/investor.json';
import AngelInvestorAirtable from '../data/airtable/Angel Investors.json';
import fs from 'fs';
import { createDataFile, readDataFromFile } from './utils';
import Container from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDBLoader';
import slugify from 'slugify';
import { RemoveSlugPattern } from '@/types';
import { uniq } from 'lodash';
/* eslint-disable no-console */
export const CompanySeed = async () => {
  createDataFile({
    _collection: 'companies',
    _file: companiesFile,
    _key: 'name',
  });
  const db = Container.get(DIMongoDB);
  const collection = db.collection('companies');
  // const count = await $countCollection({ collection });
  const categories = await db.collection('categories').find({}).toArray();
  // if (count) return;

  const tableSchemaCryptoCompanies = (InvestorAirtable as any).data.tableSchemas[4];
  const tableSchemaInvestors = (InvestorAirtable as any).data.tableSchemas[3];
  const tableSchemaAngelInvestors = (InvestorAirtable as any).data.tableSchemas[13];
  const tableDatas = (InvestorAirtable as any).data.tableDatas[0].rows;
  const companies = readDataFromFile({ _collection: 'companies' }).map((_company: any) => {
    return {
      name:
        _company.verified != 'null' && _company.verified
          ? _company.name
              .replace(_company.verified.replace('Verified Social Credentials', ''), '')
              .replace('Verified', '')
              .trim()
          : _company.name.trim(),
      description: _company.about,
      headquarter: _company['headquarters'],
      avatar: _company['avatar-src'],
      urls: {
        video: [_company.video],
        website: [_company['website-href']].filter(Boolean),
        telegram: _company.telegram && _company.telegram[0] && [_company.telegram[0]['telegram-href']].filter(Boolean),
        linkedin: _company.linkedin && _company.linkedin[0] && [_company.linkedin[0]['linkedin-href']].filter(Boolean),
        twitter: _company.twitter && _company.twitter[0] && [_company.twitter[0]['twitter-href']].filter(Boolean),
        discord: _company.discord && _company.discord[0] && [_company.discord[0]['discord-href']].filter(Boolean),
        gitter: _company.gitter && _company.gitter[0] && [_company.gitter[0]['gitter-href']].filter(Boolean),
        medium: _company.medium && _company.medium[0] && [_company.medium[0]['medium-href']].filter(Boolean),
        bitcoin_talk:
          _company.bitcoin_talk &&
          _company.bitcoin_talk[0] &&
          [_company.bitcoin_talk[0]['bitcointalk-href']].filter(Boolean),
        facebook: _company.facebook && _company.facebook[0] && [_company.facebook[0]['facebook-href']].filter(Boolean),
        youtube: _company.youtube && _company.youtube[0] && [_company.youtube[0]['youtube-href']].filter(Boolean),
        blog: _company.blog && _company.blog[0] && [_company.blog[0]['blog-href']].filter(Boolean),
        github: _company.github && _company.github[0] && [_company.github[0]['github-href']].filter(Boolean),
        reddit: _company.reddit && _company.reddit[0] && [_company.reddit[0]['reddit-href']].filter(Boolean),
        stack_exchange:
          _company.stack_exchange &&
          _company.stack_exchange[0] &&
          [_company.stack_exchange[0]['stack-exchange-href']].filter(Boolean),
        whitepaper: _company['whitepaper-href'],
        portfolios: _company.portfolio.map((portfolio: any) => portfolio['portfolio-title']).filter(Boolean),
        galleries: _company.gallery.map((gallery: any) => gallery['gallery-src']).filter(Boolean),
      },
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
    };
  });

  const airtableCompanies = (cryptoCompaniesFile as any).data.rows
    .reduce((companies: any, row: any, rows: any[]) => {
      // console.log({ rows: (cryptoCompaniesFile as any).data.rows });
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
          fldQnKGzZOW0dnf0D,
          fldfmA70dMP31b9Rq: funding,
          fldRX4OjNm9Ul1Dyp,
          fldFSvhqgXnNA8Llz,
          fldK0vbIANJe4oZgL: token,
        },
        id,
      } = row;
      // console.log({ token });
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
            cellValuesByColumnId: {
              fldjd43zfXdpAWzaq = [],
              fldT0Fasv4hkjwbb3 = [],
              fldhntVnAppLIOUAl: investors = [],
              fldruqJ51OKbiswEI: projects = [],
              fld8ZuXfzyuH1b9Dv: website,
              fldJHMHegLEl2A56n: about,
              fldSGmVP3olLGmAID: date,
              fldZpYosKMqtY2nqQ: founders = [],
              fldcDMf8A5D64Ecdf: announcement,
            },
          } = (fundraisingRoundsFile as any).data.rows.find((round: any) => round.id == item.foreignRowId);

          return {
            round_id: item.foreignRowId,
            stage: item.foreignRowDisplayName.split('-').at(-1).trim(),
            round_name: item.foreignRowDisplayName,
            description: about,
            date,
            announcement,
            founders: uniq(
              founders.map(({ foreignRowId, foreignRowDisplayName }: any) => {
                return slugify(foreignRowDisplayName, { lower: true, trim: true, remove: RemoveSlugPattern });
              }),
            ),
            investors: uniq(
              investors.map(({ foreignRowId, foreignRowDisplayName }: any) => {
                return slugify(foreignRowDisplayName, { lower: true, trim: true, remove: RemoveSlugPattern });
              }),
            ),
            urls: {
              website: [website].filter(Boolean),
            },
            amount: fldRX4OjNm9Ul1Dyp?.valuesByForeignRowId[item.foreignRowId] || 0,
            categories: [...fldjd43zfXdpAWzaq.map((item: any) => item.foreignRowDisplayName)],
            sub_categories: [...fldT0Fasv4hkjwbb3.map((item: any) => item.foreignRowDisplayName)],
            // projects: projects.flatMap(({ foreignRowId, foreignRowDisplayName }: any) => {
            //   return slugify(foreignRowDisplayName, { lower: true, trim: true, remove: RemoveSlugPattern });
            // }),
          };
        }) || [];
      const fundraising_rounds_ids = fundraising_rounds.map((item: any) => item.round_id);
      return [
        ...companies,
        {
          name,
          id,
          description: about,
          funding,
          urls: {
            twitter: [twitter].filter(Boolean),
            [fldQG6489r2BIckRi_Key]: [fldQG6489r2BIckRi].filter(Boolean),
            [fldQG6489r2BIckRi_Key == 'discord' ? 'telegram' : 'discord']: [],
            website: websites || [],
          },
          avatar: fldXIqyTI8vVF00vs ? fldXIqyTI8vVF00vs[0].url : '',

          year_founded,
          // locations: companyLocations,
          countries: companyLocations,
          founders: Object.keys(founders?.valuesByForeignRowId || {}).reduce((current: any, key: any) => {
            return [
              ...current,
              ...founders?.valuesByForeignRowId[key].map((investor: any) => {
                return slugify(investor.foreignRowDisplayName, {
                  lower: true,
                  trim: true,
                  remove: RemoveSlugPattern,
                });
              }),
            ];
          }, []),
          person_investors:
            fldFSvhqgXnNA8Llz?.map(({ foreignRowId, foreignRowDisplayName }: any) => {
              return slugify(foreignRowDisplayName, { lower: true, trim: true, remove: RemoveSlugPattern });
            }) || [],
          company_investors: [
            ...(fundraisingRoundsFile as any).data.rows
              .filter((round: any) => {
                return fundraising_rounds_ids.includes(round.id);
              })
              .reduce((current: any, round: any) => {
                return [
                  ...current,
                  ...(round.cellValuesByColumnId.fldhntVnAppLIOUAl?.map((item: any) => {
                    return slugify(item.foreignRowDisplayName, { lower: true, trim: true, remove: RemoveSlugPattern });
                  }) || []),
                ];
              }, []),
            ...(company_investors?.map(({ foreignRowId, foreignRowDisplayName }: any) => {
              return slugify(foreignRowDisplayName, { lower: true, trim: true, remove: RemoveSlugPattern });
            }) || []),
          ],
          investors: [
            ...(
              fldFSvhqgXnNA8Llz?.map((investor: any) => {
                return {
                  foreign_id: investor.foreignRowId,
                  name: investor.foreignRowDisplayName,
                };
              }) || []
            )
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
                  item.rounds = [...new Set([...item.rounds, current.round_id])];
                  return acc;
                }
                return [...acc, current];
              }, []),
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
                  item.rounds = [...new Set([...item.rounds, current.round_id])];
                  return acc;
                }
                return [...acc, current];
              }, []),
          ],
          blockchains: Object.keys(flddkP6oXlI26fizf?.valuesByForeignRowId || {}).map((key: any) => {
            return flddkP6oXlI26fizf?.valuesByForeignRowId[key];
          }),
          // projects: fundraising_rounds.map(({ categories, projects = [], ...rest }: any) => {
          //   return projects;
          // }),
          categories: fundraising_rounds
            .map(({ categories }: any) => {
              return categories;
            })
            .flat()
            .filter((item: any, index: any, self: any) => index === self.findIndex((t: any) => t === item)),

          token: tableSchemaCryptoCompanies.columns[2].typeOptions.choices[token]?.name,
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
  const investors = (InvestorAirtable as any).data.tableDatas[0].rows
    .map((investor: any) => {
      const {
        id,
        cellValuesByColumnId: {
          fldNJrXhATbXWYaPV: twitter,
          fldYxidGVWXbbBlvN: linkedin,
          fld5Ampq1nE4ddQCZ: website,
          fld2kiwtDqHbHa0bk: name,
          fldgBla8AxoEeCFU8: email = '',
          fldd6JgLkLn5Zi1QY: [{ url } = { url: '' }] = [],
          fldeCMQuCqjLHkyV7: anum,
          fldJr5Fntx0LD7Lrt: type,
          fldtCm97edmk0HPEC: year_founded,
          fldNouMK7qhaghYN1: [
            { foreignRowDisplayName: location } = {
              foreignRowDisplayName: '',
            },
          ] = [],
          fldlDOWPWSMAWL0Nd: portfolio_companies = [],
          fldH5HxvrtaYV0Kth: total_portfolio_companies = 0,
          fldmoOusFnNm07r5v: investment_fundraising_rounds = [],
          fldrHBVHyxFD6awkv: actively_investing,
          fldiOy8VClYi7B07v: investment_stage = [],
        },
      } = investor;
      // const type = angelInvestors.some((person: any) => person.name.toLowerCase() == name.toLowerCase())
      //   ? 'persons'
      //   : 'companies';
      return {
        id,
        name,
        urls: {
          twitter: [twitter].filter(Boolean),
          linkedin: [linkedin].filter(Boolean),
          website: [website].filter(Boolean),
        },
        actively_investing: tableSchemaInvestors.columns[5].typeOptions.choices[actively_investing]?.name,
        anum: tableSchemaInvestors.columns[3].typeOptions.choices[anum]?.name,
        year_founded,
        total_portfolio_companies,
        countries: [location],
        email,
        avatar: url,
        categories: ['Investor', tableSchemaAngelInvestors.columns[6].typeOptions.choices[type]?.name].filter(Boolean),
        type: tableSchemaAngelInvestors.columns[6].typeOptions.choices[type]?.name,
        investment_stage: investment_stage.map(
          (stage: any) => tableSchemaInvestors.columns[10].typeOptions.choices[stage]?.name,
        ),
        portfolio_companies: portfolio_companies.map(({ foreignRowDisplayName, foreignRowId }: any) => {
          // const {
          //   cellValuesByColumnId: {
          //     fldfxvX3xyd1uBTM4: twitter,
          //     fldQG6489r2BIckRi: contact,
          //     fldXIqyTI8vVF00vs: avatars = [],
          //     fldK0vbIANJe4oZgL: token,
          //     fldiL1KEOZO4MHcvW,
          //   },
          // } = (cryptoCompaniesFile as any).data.rows.find((company: any) => company.id == foreignRowId);
          // const contact_Key = contact?.includes('discord') ? 'discord' : 'telegram' || 'telegram';
          // const website = fldiL1KEOZO4MHcvW
          //   ? Object.values(fldiL1KEOZO4MHcvW.valuesByForeignRowId).filter(
          //       (website: any, index: any, self: any) => index === self.findIndex((t: any) => t === website),
          //     )
          //   : [];
          // return {
          //   name: foreignRowDisplayName,
          //   foreign_id: foreignRowId,
          //   avatar: avatars?.[0]?.url || '',
          //   token: tableSchemaCryptoCompanies.columns[2].typeOptions.choices[token]?.name,
          //   urls: {
          //     twitter: [twitter].filter(Boolean),
          //     [contact_Key]: [contact].filter(Boolean),
          //     [contact_Key == 'discord' ? 'telegram' : 'discord']: [],
          //     website,
          //   } as any,
          // };
          return slugify(foreignRowDisplayName, { lower: true, trim: true, remove: RemoveSlugPattern });
        }),
        investment_fundraising_rounds: investment_fundraising_rounds.map(
          ({ foreignRowDisplayName, foreignRowId }: any) => {
            // return {
            //   name: foreignRowDisplayName,
            //   foreign_id: foreignRowId,
            // };
            return foreignRowId;
          },
        ),
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
      if (type == 'Angel Investor') {
        acc['persons'] = [...(acc['persons'] || []), item];
      } else {
        acc['companies'] = [...(acc['companies'] || []), item];
      }
      return acc;
    }, {});

  const companies_final = await Promise.all(
    Object.values(
      [...airtableCompanies, ...companies, ...investors.companies].reduce((current: any, item: any) => {
        const { name, ...rest } = item;
        const lowerName = slugify(name, {
          trim: true,
          lower: true,
          strict: true,
          replacement: ' ',
          remove: RemoveSlugPattern,
        });
        return {
          ...current,
          [lowerName]: {
            ...((current[lowerName] && {
              ...Object.keys({ ...rest, ...current[lowerName] }).reduce((acc: any, key: any) => {
                if (key == 'urls') {
                  acc = {
                    ...acc,
                    urls: {
                      ...Object.keys(current[lowerName].urls).reduce((acc: any, key: any) => {
                        return {
                          ...acc,
                          [key]: [...new Set([...(current[lowerName].urls[key] || []), ...(rest.urls[key] || [])])],
                        };
                      }, {}),
                    },
                  };
                  delete rest.urls;
                  return acc;
                }

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
    ).map((item: any, index: any, items: any) => {
      const {
        foreign_id = null,
        year_founded = 0,
        funding = 0,
        founders = [],
        investors = [],
        metadata = {},
        fundraising_rounds = [],
        investment_fundraising_rounds = [],
        services = [],
        supports = [],
        team = [],
        products = [],
        clients = [],
        categories = [],
        description = '',
        // verified = false,
        headquarter = '',
        short_description = '',
        partners = [],
        cryptocurrencies = [],
        avatars = [],
        projects = [],
        countries,
        type,
        name,
        research_papers = [],
        urls: {
          portfolios = [],
          galleries = [],
          facebook = [],
          website = [],
          twitter = [],
          medium = [],
          discord = [],
          linkedin = [],
          youtube = [],
          gitter = [],
          whitepaper = [],
          stack_exchange = [],
          telegram = [],
          github = [],
          reddit = [],
        } = {
          portfolios: [],
          galleries: [],
          facebook: [],
          website: [],
          twitter: [],
          medium: [],
          discord: [],
          linkedin: [],
          youtube: [],
          gitter: [],
          whitepaper: [],
          stack_exchange: [],
          telegram: [],
          github: [],
          reddit: [],
        },
        ...rest
      } = item;
      const foreign_ids = [
        ...new Set([item.foreign_id, ...((item?.metadata?.storage || []).map((item: any) => item?.foreign_id) as [])]),
      ].filter(Boolean);
      return {
        ...rest,
        // _id: new ObjectId(),
        // name: name
        //   .replace(/[\W_]+/g, ' ')
        //   .replace(/  +/g, ' ')
        //   .trim(),
        name: slugify(name.trim(), { lower: true, strict: true, replacement: ' ', remove: RemoveSlugPattern }),
        slug: slugify(item.name, { lower: true, trim: true, remove: RemoveSlugPattern }),
        foreign_id,
        categories: [...new Set(categories)].filter(Boolean),
        countries: [...new Set(countries)].filter(Boolean),
        year_founded,
        avatars,
        funding,
        founders: [...new Set(founders)].filter(Boolean),
        investors,
        // fundraising_rounds,
        services,
        supports,
        team,
        products,
        clients,
        partners,
        description,
        headquarter,
        research_papers,
        urls: {
          portfolios,
          galleries,
          facebook,
          website,
          twitter,
          medium,
          discord,
          linkedin,
          youtube,
          gitter,
          whitepaper,
          stack_exchange,
          telegram,
          github,
          reddit,
        },
        short_description,
        cryptocurrencies,
        metadata,
        // type,
        // projects: uniq(projects.flat(10)),
        // investments: items.reduce((_total: any, _item: any) => {
        //   return [
        //     ..._total,
        //     ...investors?.reduce(
        //       (total: any, investor: any) => [
        //         ...total,
        //         ...(foreign_ids.includes(investor.foreign_id) ? [_item._id] : []),
        //       ],
        //       [],
        //     ),
        //   ];
        // }, []),
        investor_ids: investors.map(({ foreign_id }: any) => foreign_id),
        foreign_ids,
        trans: [] as any,
        deleted: false,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'admin',
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
    // total: companies_final.some((c: any) => c.total_investments),
  });
  // fs.writeFileSync(
  //   `${__dirname}/data/companies_airtable.json`,
  //   JSON.stringify(airtableCompanies).replace(/null/g, '""'),
  // );
  // fs.writeFileSync(`${__dirname}/data/companies.json`, JSON.stringify(companies).replace(/null/g, '""'));
  fs.writeFileSync(`${__dirname}/data/companies_final.json`, JSON.stringify(companies_final));
  // await db.collection('companies').insertMany(companies_final);
  // return companies_final;
};
export const companyInvestment = async () => {
  const db = Container.get(DIMongoDB);
  const companies = JSON.parse(fs.readFileSync(`${__dirname}/data/companies_final.json`, 'utf8') as any);
  const funds = JSON.parse(fs.readFileSync(`${__dirname}/data/funds.json`, 'utf8') as any);
  const persons = JSON.parse(fs.readFileSync(`${__dirname}/data/persons_final.json`, 'utf8') as any);
  const companiesFinal = (companies as any[]).map(
    ({
      foreign_id,
      foreign_ids = [],
      name,
      investors = [],
      investor_ids,
      person_investors = [],
      company_investors = [],
      // projects = [],
      // founders = [],
      portfolio_companies = [],
      ...rest
    }: any) => {
      const portfolio_funds = uniq([
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
          .map(({ slug }: any) => slug),
      ]);
      const company_investment = [
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
          .map(({ slug }: any) => slug),
      ];

      return {
        name,
        ...rest,
        // foreign_id,
        // company_investment,
        company_investors: uniq(company_investors.filter(Boolean)),
        person_investors: uniq(person_investors.filter(Boolean)),
        // projects: uniq(
        //   projects
        //     .map((item: any) => {
        //       return companies.find(
        //         ({ foreign_id }: any) => foreign_id && item.foreign_id && foreign_id == item.foreign_id,
        //       )?.slug;
        //     })
        //     .filter(Boolean),
        // ),
        // founders: uniq(
        //   founders
        //     .map((item: any) => {
        //       return persons.find(({ foreign_id }: any) => {
        //         // console.log({ item, foreign_id }, item.foreign_id == foreign_id);
        //         return foreign_id && item.foreign_id && foreign_id == item.foreign_id;
        //       })?.slug;
        //     })
        //     .filter(Boolean),
        // ),
        portfolio_funds,
        portfolio_companies: uniq([
          ...portfolio_companies,
          // .map((item: any) => {
          //   return companies.find(
          //     ({ foreign_id }: any) => foreign_id && item.foreign_id && foreign_id == item.foreign_id,
          //   )?.slug;
          // })
          // .filter(Boolean),
          ...company_investment,
        ]),

        // total_investments: investments.length,
      };
    },
  );
  fs.writeFileSync(`${__dirname}/data/_companies.json`, JSON.stringify(companiesFinal));
};
export const insertCompanies = async () => {
  const db = Container.get(DIMongoDB);
  const count = await db.collection('companies').countDocuments();
  // if (count) return;
  console.log('Inserting companies');
  const categories = await db.collection('categories').find({}).toArray();
  const companiesFinal = await Promise.all(
    JSON.parse(fs.readFileSync(`${__dirname}/data/_companies.json`, 'utf8') as any).map(
      async (item: any, index: any, items: any[]) => {
        delete item.investors;
        return {
          ...item,
          cryptocurrencies: (
            (await Promise.all(
              (item.cryptocurrencies || []).map(async (item: any) => {
                const currency = await db.collection('assets').findOne({ name: item });
                return currency ? currency.slug : null;
              }),
            )) as any
          ).filter(Boolean),
          categories: await Promise.all(
            uniq(
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
                        type: 'company',
                      } as any,
                    },
                    {
                      upsert: true,
                      returnDocument: 'after',
                    },
                  )
                ).value.name;
                // return slugify(_category, { lower: true, trim: true, replacement: '-', remove: RemoveSlugPattern });
              }),
            ),
          ),
          metadata: {
            ...item.metadata,
            storage: await Promise.all(
              item.metadata?.storage?.map(async (storage: any) => {
                return {
                  ...storage,
                  categories: await Promise.all(
                    storage.categories?.map(async (_category: any): Promise<any> => {
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
                              sub_categories: [],
                              weight: 0,
                              deleted: false,
                              created_at: new Date(),
                              updated_at: new Date(),
                              created_by: 'admin',
                              rank: 0,
                            },
                            $addToSet: {
                              type: 'company',
                            } as any,
                          },
                          {
                            upsert: true,
                            returnDocument: 'after',
                          },
                        )
                      ).value.name;
                    }) || [],
                  ),
                };
              }) || [],
            ),
          },
        };
      },
    ),
  );
  await db.collection('companies').insertMany(companiesFinal);
  console.log('companies inserted', companiesFinal.length);
};
