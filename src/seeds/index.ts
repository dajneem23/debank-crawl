import { CountrySeed } from './country';
import { CategorySeed } from './category';
import { PersonSeed, personInvestment, insertPersons } from './person';
import { ProductSeed, insertProducts } from './product';
import { CompanySeed, companyInvestment, insertCompanies } from './company';
import { CoinSeed, insertCoins } from './coin';
import { UserSeed } from './user';
import { FundSeed, fundInvestment, insertFunds } from './fund';
import { FundraisingRoundSeed, insertFundraisingRounds, crawlFundraisingRoundsFromCoinCarp } from './fundraising-round';
(async () => {
  (await import('../loaders/loggerLoader')).default();
  await (await import('../loaders/mongoDBLoader')).default();
  // await UserSeed();
  // await CountrySeed();
  // await CategorySeed();
  // await CompanySeed();
  // await CoinSeed();
  // await ProductSeed();
  // await PersonSeed();
  // await FundSeed();
  // await companyInvestment();
  // await personInvestment();
  // await fundInvestment();
  // await FundraisingRoundSeed();
  // await insertCoins();
  // await insertFunds();
  // await insertPersons();
  // await insertCompanies();
  // await insertProducts();
  // await insertFundraisingRounds();
  await crawlFundraisingRoundsFromCoinCarp();
  process.on('exit', () => {
    console.info('✅ Run seed data successfully');
  });
  process.exit(0);
})();
