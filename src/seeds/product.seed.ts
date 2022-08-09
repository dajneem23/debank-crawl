import { Connection } from 'typeorm';
import { Factory, Seeder } from 'typeorm-seeding';
import Logger from '../core/logger';
import crypto_product from '../data/crypto_slate/json/crypto_product.json';
import product_category from '../data/crypto_slate/json/product_category.json';
import product_gallery from '../data/crypto_slate/json/product_gallery.json';
import product_team from '../data/crypto_slate/json/product_team.json';
import product_ccy from '../data/crypto_slate/json/product_ccy.json';
import product_feature from '../data/crypto_slate/json/product_feature.json';
const logger = new Logger('ProductSeed');
export default class ProductSeed implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<any> {
    logger.debug('[run:start]');
    const products = [];
    products.push(
      ...crypto_product.map((item) => {
        return {
          ...item,
          createdAt: new Date(),
          categories: product_category.filter((category) => {
            return category.product_name === item.name;
          }),
          galleries: product_gallery.filter((gallery) => {
            return gallery.product_name === item.name;
          }),
          teams: product_team.filter((team) => {
            return team.product_name === item.name;
          }),
          ccys: product_ccy.filter((ccy) => {
            return ccy.product_name === item.name;
          }),
          features: product_feature.filter((feature) => {
            return feature.product_name === item.name;
          }),
        };
      }),
    );
    logger.info('[running]', { products });
    // await connection.createQueryBuilder().insert().into(CountryModel).values(products).execute();
    logger.debug('[run:end]');
  }
}
