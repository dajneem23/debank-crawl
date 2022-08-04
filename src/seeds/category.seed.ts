import { Connection } from 'typeorm';
import { Factory, Seeder } from 'typeorm-seeding';
import { CategoryModel } from '../models/category.model';
import Logger from '../core/logger';
import { CATEGORY_TYPE } from '../types/Common';
const logger = new Logger('countrySeed');
export default class CategorySeed implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<any> {
    logger.debug('[run:start]');
    // logger.info('[running]', { data });
    const rows = 20;
    const categoriesTypes = [CATEGORY_TYPE.EVENT, CATEGORY_TYPE.WIKIBLOCK, CATEGORY_TYPE.LISTENING];
    const categoryModels = Array.from(Array(rows), (_) => {
      return {
        title: (Math.random() + 1).toString(36).substring(7),
        type: categoriesTypes[Math.floor(Math.random() * categoriesTypes.length)],
        weight: Math.floor(Math.random() * 20),
        createdAt: new Date(),
      };
    });
    logger.info('[running]', { categoryModels });
    await connection.createQueryBuilder().insert().into(CategoryModel).values(categoryModels).execute();
    logger.debug('[run:end]');
  }
}
