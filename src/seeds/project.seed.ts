import { Connection } from 'typeorm';
import { Factory, Seeder } from 'typeorm-seeding';
import Logger from '../core/logger';
import crypto_project from '../data/crypto_slate/json/crypto_project.json';
import token_sector from '../data/crypto_slate/json/token_sector.json';
import token_team from '../data/crypto_slate/json/token_team.json';
import token_wallet from '../data/crypto_slate/json/token_wallet.json';
const logger = new Logger('ProjectSeed');
export default class ProjectSeed implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<any> {
    logger.debug('[run:start]');
    const projects = [];
    projects.push(
      ...(crypto_project as any).map((item: any) => {
        return {
          ...item,
          createdAt: new Date(),
          sectors: token_sector.filter((sector) => {
            return sector.token_name === item.token_id;
          }),
          teams: token_team.filter((team) => {
            return team.token_name === item.token_id;
          }),
          wallets: token_wallet.filter((wallet) => {
            return wallet.token_name === item.name;
          }),
        };
      }),
    );
    logger.info('[running]', { projects });
    // await connection.createQueryBuilder().insert().into(CountryModel).values(products).execute();
    logger.debug('[run:end]');
  }
}
