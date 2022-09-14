import Funds from '../data/airtable/Fundraising Rounds - Funds.json';
import { $toObjectId, $countCollection } from '@/utils/mongoDB';
import mongoDBLoader from '@/loaders/mongoDBLoader';
import fs from 'fs';
import Container, { Inject, Service } from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDBLoader';
export const FundSeed = async () => {
  const db = Container.get(DIMongoDB);
  const collection = db.collection('companies');
  const companies = db.collection('companies').find().toArray();
  const count = await $countCollection({ collection });
  const categories = await db.collection('categories').find({}).toArray();
  // if (count) return;
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
            return {
              foreign_id,
              name,
            };
          });
          const firm_ids = firms.map((firm: any) => firm.foreign_id);
          return {
            id,
            name: round_name.replace(stage, '').replace('-', '').trim(),
            avatars,
            avatar: avatars[0],
            round_name,
            stage,
            cryptocurrencies,
            partners: partners.map((partner: any) => {
              return {
                name: partner.foreignRowDisplayName,
                foreign_id: partner.foreignRowId,
              };
            }),
            posts: [post],
            amount,
            firms,
            firm_ids,
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
          const { partners, firms, cryptocurrencies, fundraising_rounds = [], amount = 0, ...rest } = fund;
          acc[fund.name] = {
            ...rest,
            total_amount: amount,
            partners: [...partners, ...fund.partners],
            firms: [...firms, ...fund.firms],
            cryptocurrencies: [...cryptocurrencies, ...fund.cryptocurrencies],
            fundraising_rounds: [
              ...fundraising_rounds,
              {
                round_id: fund.id,
                round_name: fund.round_name,
                stage: fund.stage,
                amount,
              },
            ],
          };
        } else {
          const {
            partners,
            firms,
            cryptocurrencies,
            fundraising_rounds = [],
            total_amount = 0,
            ...rest
          } = acc[fund.name];
          acc[fund.name] = {
            ...rest,
            total_amount: total_amount + fund.amount,
            partners: [...partners, ...fund.partners],
            firms: [...firms, ...fund.firms],
            cryptocurrencies: [...cryptocurrencies, ...fund.cryptocurrencies],
            fundraising_rounds: [
              ...fundraising_rounds,
              {
                round_id: fund.id,
                round_name: fund.round_name,
                stage: fund.stage,
                amount: fund.amount,
              },
            ],
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
        avatars = [],
        avatar = '',
        posts = [],
        total_amount = 0,
        cryptocurrencies = [],
        fundraising_rounds = [],
        partners = [],
        firms = [],
        metadata = {},
        need_review = true,
        trans = [] as any,
        categories = [],
        reviewed = false,
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
          name,
          categories: [...new Set(categories)],
          avatars,
          avatar,
          posts,
          total_amount,
          cryptocurrencies,
          fundraising_rounds,
          partners,
          firms,
          metadata,
          need_review,
          reviewed,
          trans,
          deleted,
          created_at,
          updated_at,
          created_by,
        };
      },
    );
  // fs.writeFileSync(`${__dirname}/data/funds.json`, JSON.stringify(funds));
  // await db.collection('funds').insertMany(funds);
  return funds;
};
