import { Connection } from 'typeorm';
import { Factory, Seeder } from 'typeorm-seeding';
import { CompanyModel } from '../models';
import crypto_company from '../data/crypto_slate/json/crypto_company.json';
import company_gallery from '../data/crypto_slate/json/company_gallery.json';
import company_feature from '../data/crypto_slate/json/company_feature.json';
import company_portfolio from '../data/crypto_slate/json/company_portfolio.json';
import company_team from '../data/crypto_slate/json/company_team.json';
import company_support from '../data/crypto_slate/json/company_support.json';
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
          gallies: company_gallery.filter((item) => {
            return item.company_name === company.name;
          }),
          features: company_feature.filter((item) => {
            return item.company_name === company.name;
          }),
          portfolios: company_portfolio.filter((item) => {
            return item.company_name === company.name;
          }),
          teams: company_team.filter((item) => {
            return item.company_name === company.name;
          }),
          supports: company_support.filter((item) => {
            return item.company_name === company.name;
          }),
        };
      }),
    );

    logger.info('[running]', { companies });
    // await connection.createQueryBuilder().insert().into(CompanyModel).values(companies).execute();
    logger.debug('[run:end]');
  }
}
