import { Connection } from 'typeorm';
import { Factory, Seeder } from 'typeorm-seeding';
import { SectorModel } from '../models';
import Logger from '../core/logger';
import company_sector from '../data/crypto_slate/json/company_sector.json';
import token_sector from '../data/crypto_slate/json/token_sector.json';
const logger = new Logger('SectorSeed');
export default class SectorSeed implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<any> {
    logger.debug('[run:start]');
    const sectors = [];
    sectors.push(
      ...company_sector.map((item) => {
        return {
          title: item.sector,
          weight: Math.floor(Math.random() * 100),
          createdAt: new Date(),
        };
      }),
      ...token_sector.map((item) => {
        return {
          title: item.sector,
          weight: Math.floor(Math.random() * 100),
          createdAt: new Date(),
        };
      }),
    );
    const uniqueSectors = sectors.filter((item, index, self) => {
      return (
        self.findIndex((t) => {
          return t.title === item.title;
        }) === index
      );
    });
    logger.info('[running]', { uniqueSectors });
    await connection.createQueryBuilder().insert().into(SectorModel).values(uniqueSectors).execute();
    logger.debug('[run:end]');
  }
}
