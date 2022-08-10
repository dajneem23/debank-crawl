import { Connection } from 'typeorm';
import { Factory, Seeder } from 'typeorm-seeding';
import { FeatureModel } from '../models';
import product_feature from '../data/crypto_slate/json/product_feature.json';
import company_feature from '../data/crypto_slate/json/company_feature.json';

import Logger from '../core/logger';
const logger = new Logger('FeatureSeed');
export default class FeatureSeed implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<any> {
    logger.debug('[run:start]');
    const features = [];
    features.push(
      ...product_feature.map((item) => {
        return {
          name: item.feature,
          createdAt: new Date(),
        };
      }),
      ...company_feature.map((item) => {
        return {
          name: item.feature,
          createdAt: new Date(),
        };
      }),
    );
    logger.info('[running]', { features });
    // await connection.createQueryBuilder().insert().into(FeatureModel).values(glossaries).execute();
    logger.debug('[run:end]');
  }
}
