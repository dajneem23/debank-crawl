import { Connection } from 'typeorm';
import { Factory, Seeder } from 'typeorm-seeding';
import { CompanyModel } from '../models';
import crypto_company from '../data/crypto_slate/json/crypto_company.json';
import Logger from '../core/logger';
const logger = new Logger('CompanySeed');
export default class CompanySeed implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<any> {
    logger.debug('[run:start]');
    const companies = [];
    companies.push(
      ...crypto_company.map((company) => {
        return {
          name: company.name,
          avatar: company.avatar,
          about: company.about,
          blog: company.blog,
          medium: company.medium,
          twitter: company.twitter,
          facebook: company.facebook,
          linkedin: company.linkedin,
          telegram: company.telegram,
          reddit: company.reddit,
          instagram: company.instagram,
          headquarter: company.headquarter,
          director: company.director,
          createdAt: new Date(),
        };
      }),
    );

    logger.info('[running]', { companies });
    // await connection.createQueryBuilder().insert().into(CompanyModel).values(companies).execute();
    logger.debug('[run:end]');
  }
}
