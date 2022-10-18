import Funds from '../data/airtable/Fundraising Rounds - Funds.json';
import { $toObjectId, $countCollection } from '@/utils/mongoDB';
import fs from 'fs';
import Container, { Inject, Service } from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDBLoader';
import slugify from 'slugify';
import { RemoveSlugPattern } from '@/types';
import AngelInvestorAirtable from '../data/airtable/Angel Investors.json';
import InvestorAirtable from '../data/airtable/investor.json';
import FundFounders from '../data/airtable/Funds - Founders.json';
import { uniq } from 'lodash';
/* eslint-disable no-console */
export const FundSeed = async () => {
  const db = Container.get(DIMongoDB);
  const funds = Object.values(
    (Funds as any).data.rows
      .map(
        ({
          id,
          cellValuesByColumnId: {
            fldH3vfWCGhZQoTT0: round_name,
            fldsJXOoeuQ9iQpcM: partners = [],
            fldxtL1WFCMMgh5aR: _firms = [],
            flddZlypzkh4Bv8VM: stage,
            fldeTAeeyCI1aQZA0: amount = 0,
            fldfKdIjZ6u7Zh8Yd: post = '',
            fld6UwhGKLL1xyj7O: { valuesByForeignRowId: _avatars } = {
              valuesByForeignRowId: {},
            },
            fldECcA5loIImcT24: investors = [],
            fldaYeGmxIHw8htGV: AngelInvestors = [],
            cryptocurrencies = [],
          },
        }: any) => {
          const avatars = Object.values(_avatars as any[]).flatMap((avatar: any) => {
            return avatar.map(({ url }: any) => {
              return url;
            });
          });
          const firms = _firms.map(({ foreignRowId: foreign_id, foreignRowDisplayName: name }: any) => {
            // const {
            //   cellValuesByColumnId: {
            //     fldNJrXhATbXWYaPV: twitter,
            //     fldYxidGVWXbbBlvN: linkedin,
            //     fld5Ampq1nE4ddQCZ: website,
            //     fldd6JgLkLn5Zi1QY: avatars,
            //   },
            // } = (InvestorAirtable as any).data.tableDatas[0].rows.find((item: any) => item.id == foreign_id);
            // return {
            //   foreign_id,
            //   name,
            //   avatar: avatars?.[0]?.url || '',
            //   urls: {
            //     linkedin,
            //     twitter,
            //     website,
            //   },
            // };\
            return slugify(name, { lower: true, trim: true, remove: RemoveSlugPattern });
          });
          const firm_ids = firms.map((firm: any) => firm.foreign_id);

          return {
            id,
            // name: round_name
            //   .replace(stage, '')
            //   .replace('-', '')
            //   .replace(/[\W_]+/g, ' ')
            //   .replace(/  +/g, ' ')
            //   .trim(),
            name: slugify(round_name.replace(stage, '').trim(), {
              lower: true,
              strict: true,
              replacement: ' ',
              remove: RemoveSlugPattern,
            }),
            avatars,
            avatar: avatars[0],
            round_name,
            investment_stage: [stage],
            cryptocurrencies,
            partners: partners.map(({ foreignRowDisplayName: name, foreignRowId: foreign_id }: any) => {
              // const {
              //   cellValuesByColumnId: { fldTsT4wtJYYxc6xN: twitter },
              // } = (FundFounders as any).data.rows.find((item: any) => item.id == foreign_id);
              // return {
              //   name,
              //   foreign_id,
              //   urls: {
              //     twitter,
              //   },
              // };
              return slugify(name, { lower: true, trim: true, remove: RemoveSlugPattern });
            }),
            posts: [post].filter(Boolean),
            amount,
            firms,
            firm_ids,
            person_investors:
              AngelInvestors?.map(({ foreignRowDisplayName: name, foreignRowId: foreign_id }: any) => {
                // const {
                //   cellValuesByColumnId: {
                //     fldj5t3yMdaLI3KtM: twitter,
                //     flduTkjX7gWZXGV9E: linkedin,
                //     fldBWovHdHDSZiqgQ: website,
                //     fldJsLm2w5mTLnBuP: avatars,
                //   },
                // } = (AngelInvestorAirtable as any).data.rows.find((row: any) => row.id === foreign_id);
                // return {
                //   name,
                //   foreign_id,
                //   type: 'Angel Investor',
                //   avatar: avatars?.[0]?.url || '',
                //   urls: {
                //     linkedin,
                //     twitter,
                //     website,
                //   },
                // };
                return slugify(name, { lower: true, trim: true, remove: RemoveSlugPattern });
              }) || [],
            company_investors:
              investors?.map(({ foreignRowDisplayName: name, foreignRowId: foreign_id }: any) => {
                // const {
                //   cellValuesByColumnId: {
                //     fldNJrXhATbXWYaPV: twitter,
                //     fldYxidGVWXbbBlvN: linkedin,
                //     fld5Ampq1nE4ddQCZ: website,
                //     fldd6JgLkLn5Zi1QY: avatars,
                //   },
                // } = (InvestorAirtable as any).data.tableDatas[0].rows.find((item: any) => item.id == foreign_id);
                // return {
                //   name,
                //   foreign_id,
                //   type: 'Investor',
                //   avatar: avatars?.[0]?.url || '',
                //   urls: {
                //     linkedin,
                //     twitter,
                //     website,
                //   },
                // };
                return slugify(name, { lower: true, trim: true, remove: RemoveSlugPattern });
              }) || [],
            investors: [
              ...(investors?.map(({ foreignRowDisplayName: name, foreignRowId: foreign_id }: any) => {
                return {
                  name,
                  foreign_id,
                  type: 'Investor',
                };
              }) || []),
              ...(AngelInvestors?.map(({ foreignRowDisplayName: name, foreignRowId: foreign_id }: any) => {
                return {
                  name,
                  foreign_id,
                  type: 'Angel Investor',
                };
              }) || []),
            ],
          };
        },
      )
      .reduce((acc: any, fund: any) => {
        if (!acc[fund.name]) {
          const { partners, firms, cryptocurrencies = [], fundraising_rounds = [], amount = 0, ...rest } = fund;
          acc[fund.name] = {
            ...rest,
            total_amount: amount,
            partners: [...partners, ...fund.partners],
            firms: [...firms, ...fund.firms],
            cryptocurrencies: [...cryptocurrencies, ...fund.cryptocurrencies],
            // fundraising_rounds: [
            //   ...fundraising_rounds,
            //   {
            //     round_id: fund.id,
            //     round_name: fund.round_name,
            //     stage: fund.stage,
            //     amount,
            //   },
            // ],
          };
        } else {
          const {
            partners,
            firms,
            cryptocurrencies,
            // fundraising_rounds = [],
            total_amount = 0,
            name,
            ...rest
          } = acc[fund.name];
          acc[fund.name] = {
            ...rest,
            name,
            total_amount: total_amount + fund.amount,
            partners: [...partners, ...fund.partners],
            firms: [...firms, ...fund.firms],
            cryptocurrencies: [...cryptocurrencies, ...fund.cryptocurrencies],
            // fundraising_rounds: [
            //   ...fundraising_rounds,
            //   {
            //     round_id: fund.id,
            //     round_name: fund.round_name,
            //     stage: fund.stage,
            //     amount: fund.amount,
            //   },
            // ],
          };
        }
        return acc;
      }, {}),
  )
    .map(({ partners, categories = [], firms, ...rest }: any) => {
      return {
        ...rest,
        categories,
        partners: partners.filter((partner: any, index: any, self: any) => {
          return index === self.findIndex((t: any) => t.foreign_id === partner.foreign_id);
        }),
        firms: firms.filter((firm: any, index: any, self: any) => {
          return index === self.findIndex((t: any) => t.foreign_id === firm.foreign_id);
        }),
      };
    })
    .map(
      ({
        id: foreign_id,
        about = '',
        name,
        // avatars = [],
        avatar = '',
        posts = [],
        total_amount = 0,
        cryptocurrencies = [],
        // fundraising_rounds = [],
        partners = [],
        firms = [],
        metadata = {},
        trans = [] as any,
        categories = [],
        deleted = false,
        created_at = new Date(),
        updated_at = new Date(),
        created_by = 'admin',
        round_name,
        stage,
        ...rest
      }: any) => {
        return {
          ...rest,
          foreign_id,
          foreign_ids: firms.map(({ foreign_id }: any) => foreign_id),
          about,
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
          slug: slugify(name, { lower: true, trim: true, remove: RemoveSlugPattern }),
          categories: [...new Set(categories)],
          // avatars,
          avatar,
          posts,
          total_amount,
          cryptocurrencies,
          // fundraising_rounds,
          partners,
          firms,
          metadata,
          trans,
          deleted,
          created_at,
          updated_at,
          created_by,
        };
      },
    );
  fs.writeFileSync(`${__dirname}/data/funds.json`, JSON.stringify(funds));
  // await db.collection('funds').insertMany(funds);
  return funds;
};
export const fundInvestment = async () => {
  const companies = JSON.parse(fs.readFileSync(`${__dirname}/data/companies_final.json`, 'utf8') as any);
  const funds = JSON.parse(fs.readFileSync(`${__dirname}/data/funds.json`, 'utf8') as any);
  const db = Container.get(DIMongoDB);
  const fundsFinal = funds.map(({ foreign_id, foreign_ids = [], name, ...rest }: any) => {
    const investments = uniq([
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
        .map(
          ({ foreign_id, name: investor_name, avatar, urls, slug }: any) => slug,
          // {
          // foreign_id,
          // avatar,
          // urls,
          // name: investor_name,
          // type: 'company',
          // }
        ),
    ]);
    return {
      name,
      ...rest,
      foreign_id,
      portfolio_companies: investments,
      // total_investments: investments.length,
    };
  });
  fs.writeFileSync(`${__dirname}/data/_funds.json`, JSON.stringify(fundsFinal));
};

export const insertFunds = async () => {
  const db = Container.get(DIMongoDB);
  // const count = await db.collection('funds').countDocuments();
  // if (count) return;
  // const category = await db
  //   .collection('categories')
  //   .find({
  //     name: 'funds',
  //   })
  //   .toArray();
  console.log('inserting funds');
  const fundsFinal = JSON.parse(fs.readFileSync(`${__dirname}/data/_funds.json`, 'utf8') as any).map(
    ({ name, categories = [], investors, ...rest }: any) => ({
      name,
      categories: ['funds'],
      ...rest,
    }),
  );
  await db.collection('companies').insertMany(fundsFinal);
  console.log('funds inserted', fundsFinal.length);
};
