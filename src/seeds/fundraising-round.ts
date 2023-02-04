import companiesFile from '../data/crypto_slate/json/companies.json';
import cryptoCompaniesFile from '../data/airtable/Crypto Companies.json';
import companiesFundraisingRoundsFile from '../data/airtable/Fundraising Rounds - Companies.json';
import InvestorAirtable from '../data/airtable/investor.json';
import AngelInvestorAirtable from '../data/airtable/Angel Investors.json';
import fs from 'fs';
import Container from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDB.loader';
import slugify from 'slugify';
import { RemoveSlugPattern } from '@/types';
import { uniq } from 'lodash';
import fundFundrainsingRoundsFile from '../data/airtable/Fundraising Rounds - Funds.json';
import axios from 'axios';
import { sleep } from '@/utils/common';

/* eslint-disable no-console */
export const FundraisingRoundSeed = async () => {
  const db = Container.get(DIMongoDB);
  const fundFundraisingRounds = fundFundrainsingRoundsFile.data.rows.map(
    ({
      cellValuesByColumnId: {
        flddZlypzkh4Bv8VM: stage,
        fldH3vfWCGhZQoTT0: round_name,
        fldeTAeeyCI1aQZA0: amount = 0,
        fldECcA5loIImcT24: lps = [],
        fldaYeGmxIHw8htGV: angelInvestors = [],
        fldsJXOoeuQ9iQpcM: partners = [],
        fldfKdIjZ6u7Zh8Yd: announcement,
        fldxtL1WFCMMgh5aR: firms,
        fld6UwhGKLL1xyj7O: { valuesByForeignRowId: _avatars } = {
          valuesByForeignRowId: {},
        },
        fld0k5yXG8iIoDYQo: date,
      },
    }) => {
      const avatars = Object.values(_avatars as any[]).flatMap((avatar: any) => {
        return avatar.map(({ url }: any) => {
          return url;
        });
      });
      return {
        name: round_name,
        stage,
        fund: slugify(round_name.replace(stage, '').trim(), {
          trim: true,
          lower: true,
          strict: true,
          replacement: '-',
          remove: RemoveSlugPattern,
        }),
        lps: lps.map(({ foreignRowDisplayName }) =>
          slugify(foreignRowDisplayName, { lower: true, trim: true, remove: RemoveSlugPattern }),
        ),
        investors: angelInvestors.map(({ foreignRowDisplayName }) =>
          slugify(foreignRowDisplayName, { lower: true, trim: true, remove: RemoveSlugPattern }),
        ),
        avatar: avatars[0],
        amount,
        announcement,
        date,
        urls: {
          avatar: avatars,
        },
        partners: partners.map(({ foreignRowDisplayName }) =>
          slugify(foreignRowDisplayName, { lower: true, trim: true, remove: RemoveSlugPattern }),
        ),
        firms: firms.map(({ foreignRowDisplayName }) =>
          slugify(foreignRowDisplayName, { lower: true, trim: true, remove: RemoveSlugPattern }),
        ),
      };
    },
  );
  const companiesFundraisingRounds = (companiesFundraisingRoundsFile as any).data.rows.map(
    ({
      cellValuesByColumnId: {
        fld0t86SH12Fx2aD6: stage = [],
        fldhntVnAppLIOUAl: investors = [],
        fldJHMHegLEl2A56n: description,
        fldZpYosKMqtY2nqQ: founders = [],
        fld8ZuXfzyuH1b9Dv: website,
        fldruqJ51OKbiswEI: projects = [],
        fldT0Fasv4hkjwbb3: sub_categories = [],
        fldjd43zfXdpAWzaq: categories = [],
        fld7v0ugjCe9N07W1: round_name,
        fldbHI1iWcw6U912R: amount,
        fld40xiFAj65VgtMj: { valuesByForeignRowId: _avatars } = {
          valuesByForeignRowId: {},
        },
      },
    }: any) => {
      const avatars = Object.values(_avatars as any[]).flatMap((avatar: any) => {
        return avatar.map(({ url }: any) => {
          return url;
        });
      });
      return {
        description,
        name: round_name,
        amount,
        avatar: avatars[0],
        stage: stage.map(({ foreignRowDisplayName }: any) =>
          slugify(foreignRowDisplayName, { lower: true, trim: true, remove: RemoveSlugPattern }),
        )[0],
        company: projects.map(({ foreignRowDisplayName }: { foreignRowDisplayName: string }) =>
          slugify(foreignRowDisplayName, { lower: true, trim: true, remove: RemoveSlugPattern }),
        )[0],
        founders: founders.map(({ foreignRowDisplayName }: any) =>
          slugify(foreignRowDisplayName, { lower: true, trim: true, remove: RemoveSlugPattern }),
        ),
        categories: categories.map(({ foreignRowDisplayName }: any) =>
          slugify(foreignRowDisplayName, { lower: true, trim: true, remove: RemoveSlugPattern }),
        ),
        sub_categories: sub_categories.map(({ foreignRowDisplayName }: any) =>
          slugify(foreignRowDisplayName, { lower: true, trim: true, remove: RemoveSlugPattern }),
        ),
        investors: investors.map(({ foreignRowDisplayName }: { foreignRowDisplayName: string }) =>
          slugify(foreignRowDisplayName, { lower: true, trim: true, remove: RemoveSlugPattern }),
        ),
        urls: {
          website: [website].filter(Boolean),
          avatar: avatars,
        },
      };
    },
  );
  const fundraisingRounds = [...fundFundraisingRounds, ...companiesFundraisingRounds];
  console.log(fundraisingRounds.some(({ urls: { avatar } }) => avatar.length > 1));
  fs.writeFileSync(`${__dirname}/data/_fundraising-rounds.json`, JSON.stringify(fundraisingRounds));
  // await db.collection('funds').insertMany(funds);
  // return funds;
};

export const crawlFundraisingRoundsFromCoinCarp = async () => {
  let draw = 1;
  let start = 0;
  const length = 20;
  let data: any[] = [];

  while (true) {
    await sleep(10000);

    const {
      recordstotal,
      recordsfiltered,
      code,
      data: { list },
    } = await axios
      .get('https://sapi.coincarp.com/api/v1/market/fundraising/list', {
        params: {
          draw,
          start,
          length,
          'columns[0][data]': 'projectname',
          lang: 'en-US',
          'columns[0][orderable]': 'false',
          'columns[3][data]': 'fundamount',
          'columns[4][search][regex]': false,
          // 'search[value]': '',
          'columns[1][searchable]': true,
          'columns[5][data]': 'funddate',
          _: 1666748943087,
          'columns[1][data]': 'categorylist',
          'columns[3][orderable]': true,
          'columns[5][searchable]': true,
          'columns[1][search][regex]': false,
          'columns[5][orderable]': true,
          'columns[2][data]': 'fundstagename',
          'columns[3][search][regex]': false,
          'columns[4][data]': 'investorlist',
          'columns[5][search][regex]': false,
          'columns[2][searchable]': true,
        },
      })
      .then(({ data }) => data);

    console.log({ draw, start, length, code, list: list?.length });
    if (!list.length) break;
    fs.writeFileSync(`${__dirname}/data/coincarp/fundraising-rounds-${draw}.json`, JSON.stringify(list));
    data = [...data, ...list];
    start += length;
    draw++;
  }
};

export const insertFundraisingRounds = async () => {
  const db = Container.get(DIMongoDB);
  console.log('inserting fundraising-rounds');
  const fundsFinal = JSON.parse(fs.readFileSync(`${__dirname}/data/_fundraising-rounds.json`, 'utf8') as any);
  await db.collection('fundraising-rounds').insertMany(fundsFinal);
  console.log('fundraising-rounds  inserted', fundsFinal.length);
};
