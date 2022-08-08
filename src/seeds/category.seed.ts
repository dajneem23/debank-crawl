import { Connection } from 'typeorm';
import { Factory, Seeder } from 'typeorm-seeding';
import { CategoryModel } from '../models';
import Logger from '../core/logger';
import { CATEGORY_TYPE } from '../types/Common';
import product_category from '../data/crypto_slate/json/product_category.json';
import categories_event from '../data/categories_event.json';
import categories_crypto from '../data/categories_crypto_asset.json';
import { match } from 'assert';
const logger = new Logger('CategorySeed');
export default class CategorySeed implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<any> {
    logger.debug('[run:start]');
    const categories = [];
    categories.push(
      ...product_category.map((item) => {
        return {
          title: item.category,
          type: CATEGORY_TYPE.WIKIBLOCK,
          weight: Math.floor(Math.random() * 100),
          createdAt: new Date(),
        };
      }),
      ...categories_event.map((item) => {
        return {
          title: item.title,
          weight: Math.floor(Math.random() * 100),
          type: CATEGORY_TYPE.EVENT,
          createdAt: new Date(),
        };
      }),
      ...categories_crypto.map((item) => {
        return {
          title: item.title,
          weight: Math.floor(Math.random() * 100),
          type: CATEGORY_TYPE.WIKIBLOCK,
          createdAt: new Date(),
        };
      }),
    );
    const uniqueCategories = categories.filter((item, index, self) => {
      return (
        self.findIndex((t) => {
          return t.title === item.title;
        }) === index
      );
    });
    logger.info('[running]', { uniqueCategories });
    await connection.createQueryBuilder().insert().into(CategoryModel).values(uniqueCategories).execute();
    logger.debug('[run:end]');
  }
}
