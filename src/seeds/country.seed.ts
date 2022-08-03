import { Connection } from 'typeorm';
import { Factory, Seeder } from 'typeorm-seeding';
import { CountryModel } from '../models/country.model';
import Logger from '../core/logger';
import data from '../data/contries.json';
const logger = new Logger('countrySeed');
export default class CreateCountrySeed implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<any> {
    logger.debug('[run:start]');
    // logger.info('[running]', { data });
    // const contries = data.map((item) => {
    //   return {
    //     name: item.name.common,
    //     code: item.cca2,
    //     createdAt: new Date(),
    //     updatedAt: new Date(),
    //   };
    // });
    // logger.info('[running]', { contries });
    // await connection.createQueryBuilder().insert().into(CountryModel).values(contries).execute();
    logger.debug('[run:end]');
  }
}
