import { Connection } from 'typeorm';
import { Factory, Seeder } from 'typeorm-seeding';
import { CryptoAssetTagModel } from '../models/crypto_asset_tag.model';
import Logger from '../core/logger';
const logger = new Logger('countrySeed');
export default class CryptoAssetTagSeed implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<any> {
    logger.debug('[run:start]');
    // logger.info('[running]', { data });
    const rows = 20;
    const cryptoAssetTags = Array.from(Array(rows), (_) => {
      return {
        name: (Math.random() + 1).toString(36).substring(7),
        createdAt: new Date(),
      };
    });
    const hideTag = [
      {
        name: 'trending',
        isShow: false,
        createdAt: new Date(),
      },
      {
        name: 'significant',
        isShow: false,
        createdAt: new Date(),
      },
    ];
    cryptoAssetTags.push(...hideTag);
    logger.info('[running]', { cryptoAssetTags });
    await connection.createQueryBuilder().insert().into(CryptoAssetTagModel).values(cryptoAssetTags).execute();
    logger.debug('[run:end]');
  }
}
