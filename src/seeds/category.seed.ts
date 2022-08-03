import { Connection } from 'typeorm';
import { Factory, Seeder } from 'typeorm-seeding';
import { CategoryModel } from '@/models/category.model';
import Logger from '../core/logger';
import { alphabetSize6 } from '../utils/randomString';
import { random } from 'lodash';
const logger = new Logger('countrySeed');
export default class CryptoAssetTagSeed implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<any> {
    logger.debug('[run:start]');
    // logger.info('[running]', { data });
    const rows = 20;
    const categoryModels = Array.from(Array(rows), (_) => {
      return {
        title: (Math.random() + 1).toString(36).substring(7),
        createdAt: new Date(),
      };
    });
    logger.info('[running]', { categoryModels });
    await connection.createQueryBuilder().insert().into(CategoryModel).values(categoryModels).execute();
    logger.debug('[run:end]');
  }
}
