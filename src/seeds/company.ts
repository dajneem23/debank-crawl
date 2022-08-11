import mongoDBLoader from '@/loaders/mongoDBLoader';
import { countCollection } from '@/utils/common';
import crypto_company from '../data/crypto_slate/json/crypto_company.json';
import company_feature from '../data/crypto_slate/json/company_feature.json';
import company_gallery from '../data/crypto_slate/json/company_gallery.json';
import company_ccy from '../data/crypto_slate/json/company_ccy.json';
import company_team from '../data/crypto_slate/json/company_team.json';
import company_portfolio from '../data/crypto_slate/json/company_portfolio.json';
import company_sector from '../data/crypto_slate/json/company_sector.json';
import company_product from '../data/crypto_slate/json/company_product.json';
import company_support from '../data/crypto_slate/json/company_support.json';

export const CompanySeed = async () => {
  /* eslint-disable no-console */
  console.log('Running companies seed');
  const db = await mongoDBLoader();
  const collection = db.collection('companies');
  const count = await countCollection(collection);
  const categories = await db.collection('categories').find({}).toArray();
  const sectors = await db.collection('sectors').find({}).toArray();
  const products = await db.collection('products').find({}).toArray();
  const companies = [];
  companies.push(
    ...crypto_company.map((_company) => {
      const {
        name,
        director,
        headquarter,
        avatar,
        blog,
        medium,
        reddit,
        twitter,
        youtube,
        facebook,
        linkedin,
        telegram,
        instagram,
        about,
      } = _company;
      return {
        name,
        director,
        headquarter,
        avatar,
        blog,
        medium,
        reddit,
        twitter,
        youtube,
        facebook,
        linkedin,
        telegram,
        instagram,
        about,
        galleries: company_gallery
          .filter((gallery) => gallery.company_name == name)
          .map((gallery) => {
            return {
              url: gallery.gallery,
            };
          }),
        ccys: company_ccy
          .filter((ccy) => ccy.company_name == name)
          .map((ccy) => {
            return ccy.ccy;
          }),
        features: company_feature
          .filter((feature) => feature.company_name == name)
          .map((feature) => {
            return feature.feature;
          }),
        teams: company_team
          .filter((team) => team.company_name == name)
          .map((team) => {
            return team.team;
          }),
        portfolios: company_portfolio
          .filter((portfolio) => portfolio.company_name == name)
          .map((company) => {
            return company.portfolio;
          }),
        sectors: company_sector
          .filter((company) => company.company_name == name)
          .map((sector) => {
            return sectors.find((_sector) => {
              return _sector.title == sector.sector;
            })?._id;
          }),
        supports: company_support
          .filter((support) => support.company_name == name)
          .map((support) => {
            return support.support;
          }),
        products: company_product
          .filter((company) => company.company_name == name)
          .map((product) => {
            return products.find((_product) => {
              return _product.name == product.product;
            })?._id;
          }),
        created_at: new Date(),
        updated_at: new Date(),
      };
    }),
  );
  // console.log(companies.find((company) => company.products.length > 1));
  if (!count) {
    console.log('Inserting companies', companies.length);
    await collection.insertMany(companies);
  }
};
