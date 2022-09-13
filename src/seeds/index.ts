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

(async () => {
  (await import('../loaders/loggerLoader')).default();
  // await (await import('../loaders/mongoDBLoader')).default();
  await Promise.all([UserSeed(), CategorySeed(), CountrySeed()]);
  // await Promise.all([CompanySeed(), ProductSeed(), PersonSeed(), CoinSeed()]);
  // await CompanySeed();
  // await FundSeed();
  // await PersonSeed();
  process.on('exit', () => {
    console.info('✅ Run seed data successfully');
  });
  process.exit(0);
})();
