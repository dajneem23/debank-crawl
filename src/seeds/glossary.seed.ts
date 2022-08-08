import { Connection } from 'typeorm';
import { Factory, Seeder } from 'typeorm-seeding';
import { GlossaryModel } from '../models';
import crypto_glossary from '../data/crypto_slate/json/crypto_glossary.json';
import Logger from '../core/logger';
const logger = new Logger('GlossarySeed');
export default class GlossarySeed implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<any> {
    logger.debug('[run:start]');
    const glossaries = [];
    glossaries.push(
      ...crypto_glossary.map((item) => {
        return {
          name: item.name,
          define: item.define,
          createdAt: new Date(),
        };
      }),
    );
    const uniqueGlossaries = glossaries.filter((item, index, self) => {
      return (
        self.findIndex((t) => {
          return t.name === item.name;
        }) === index
      );
    });
    logger.info('[running]', { uniqueGlossaries });
    // await connection.createQueryBuilder().insert().into(GlossaryModel).values(uniqueGlossaries).execute();
    logger.debug('[run:end]');
  }
}
