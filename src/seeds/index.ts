import { CountrySeed } from './country';
import { EventSeed } from './event';
import { CategorySeed } from './category';
import { SectorSeed } from './sector';
import { PersonSeed } from './person';
import { ProductSeed } from './product';
import { CompanySeed } from './company';
import { CoinSeed } from './coin';
export default async () => {
  await CategorySeed();
  await SectorSeed();
  await CountrySeed();
  await EventSeed();
  await PersonSeed();
  await ProductSeed();
  await CompanySeed();
  await CoinSeed();
};
