import { CountrySeed } from './country';
// import { EventSeed } from './event';
import { CategorySeed } from './category';
// import { SectorSeed } from './sector';
import { PersonSeed } from './person';
import { ProductSeed } from './product';
import { CompanySeed } from './company';
import { CoinSeed } from './coin';
import { UserSeed } from './user';
import { FundSeed } from './fund';
import fs from 'fs';
import companies from './data/companies_final.json';
import persons from './data/persons_final.json';
import funds from './data/funds.json';
(async () => {
  (await import('../loaders/loggerLoader')).default();
  await (await import('../loaders/mongoDBLoader')).default();
  await Promise.all([UserSeed(), CategorySeed(), CountrySeed()]);
  // await Promise.all([CompanySeed(), ProductSeed(), CoinSeed()]);
  // await ProductSeed();
  // await CoinSeed();
  await investmentRelationship();

  process.on('exit', () => {
    console.info('✅ Run seed data successfully');
  });
  process.exit(0);

  async function investmentRelationship() {
    // const companies = await CompanySeed();
    // const companies = fs.readFileSync('./src/seeds/data/companies_final.json', 'utf8');
    // const funds = await FundSeed();
    // const persons = await PersonSeed();
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
          .map(({ foreign_id, name }: any) => ({
            foreign_id,
            name,
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
          .map(({ foreign_id, name }: any) => ({
            foreign_id,
            name,
            type: 'funds',
          }))
          .filter((_item: any, index: any, items: any) => {
            return index == items.findIndex((item: any) => item.foreign_id == _item.foreign_id);
          }),
      ];
      // .map(({ investors = [], foreign_id: company_id }: any) => {
      //   return company_id;
      // });
      return {
        ...rest,
        foreign_id,
        investments,
        total_investments: investments.length,
      };
    });
    fs.writeFileSync(`${__dirname}/data/persons_final_final.json`, JSON.stringify(personsFinal));
  }
})();
