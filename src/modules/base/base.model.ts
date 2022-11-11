import {
  Collection,
  Db,
  IndexDirection,
  CreateIndexesOptions,
  FindOneAndUpdateOptions,
  AggregateOptions,
  AggregationCursor,
  WithId,
} from 'mongodb';
import Container from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDBLoader';
import { DILogger } from '@/loaders/loggerLoader';
import Logger from '@/core/logger';
import { throwErr } from '@/utils/common';
import { $lookup, $toMongoFilter } from '@/utils/mongoDB';
import { $refValidation } from '@/utils/validation';
import { COLLECTION_NAMES, PRIVATE_KEYS, RemoveSlugPattern, T } from '@/types';
import slugify from 'slugify';
import { omit, uniq } from 'lodash';

/**
 * @class BaseModel
 * @description Base model for all models
 */
export class BaseModel {
  readonly _collection: Collection;

  readonly _collectionName: keyof typeof COLLECTION_NAMES;

  readonly _keys: (string | number | symbol)[];

  readonly _defaultFilter = {
    deleted: false,
  };
  readonly _defaultKeys = ['author', 'id'];
  // Get Db instance from DI
  readonly db: Db = Container.get(DIMongoDB) as Db;
  // Get logger Instance from DI
  readonly logger: Logger = Container.get(DILogger) as Logger;
  //init error
  public error(msg: string, detail?: any[]): any {
    this.logger.error('error', `[${this._collectionName}:error]`, msg, detail);
    return new Error(msg);
  }

  get $lookups(): {
    country: any;
    products: any;
    projects: any;
    categories: any;
    author: any;
    cryptocurrencies: any;
    event_tags: any;
    person_tags: any;
    product_tags: any;
    company_tags: any;
    coin_tags: any;
    speakers: any;
    sub_categories: any;
    person_sponsors: any;
    fund_sponsors: any;
    company_sponsors: any;
    asset_price: any;
    portfolio_companies: any;
    portfolio_funds: any;
    company_investors: any;
    person_investors: any;
    company_projects: any;
    founders: any;
    partners: any;
    firms: any;
  } {
    return {
      products: $lookup({
        from: 'products',
        refFrom: 'slug',
        refTo: 'products',
        select: 'name avatar slug urls',
        reName: 'products',
        operation: '$in',
      }),
      projects: $lookup({
        from: 'projects',
        refFrom: 'slug',
        refTo: 'projects',
        select: 'name avatar slug urls',
        reName: 'projects',
        operation: '$in',
      }),
      categories: $lookup({
        from: 'categories',
        refFrom: 'name',
        refTo: 'categories',
        select: 'title type name weight',
        reName: 'categories',
        operation: '$in',
      }),
      author: $lookup({
        from: 'users',
        refFrom: 'id',
        refTo: 'created_by',
        select: 'full_name picture avatar slug',
        reName: 'author',
        operation: '$eq',
      }),

      cryptocurrencies: $lookup({
        from: 'coins',
        refFrom: 'slug',
        refTo: 'cryptocurrencies',
        select: 'name symbol avatar slug urls',
        reName: 'cryptocurrencies',
        operation: '$in',
      }),
      country: $lookup({
        from: 'countries',
        refFrom: 'code',
        refTo: 'country',
        select: 'name code',
        reName: 'country',
        operation: '$eq',
      }),
      coin_tags: $lookup({
        from: 'coins',
        refFrom: 'slug',
        refTo: 'coin_tags',
        select: 'name avatar slug symbol urls',
        reName: 'coin_tags',
        operation: '$in',
      }),
      company_tags: $lookup({
        from: 'companies',
        refFrom: 'slug',
        refTo: 'company_tags',
        select: 'name slug avatar urls',
        reName: 'company_tags',
        operation: '$in',
      }),
      product_tags: $lookup({
        from: 'products',
        refFrom: 'slug',
        refTo: 'product_tags',
        select: 'name avatar slug urls',
        reName: 'product_tags',
        operation: '$in',
      }),
      person_tags: $lookup({
        from: 'persons',
        refFrom: 'slug',
        refTo: 'person_tags',
        select: 'name avatar slug urls',
        reName: 'person_tags',
        operation: '$in',
      }),
      event_tags: $lookup({
        from: 'events',
        refFrom: 'slug',
        refTo: 'event_tags',
        select: 'name avatar slug urls',
        reName: 'event_tags',
        operation: '$in',
      }),
      speakers: $lookup({
        from: 'persons',
        refFrom: 'slug',
        refTo: 'speakers',
        select: 'name avatar slug urls',
        reName: 'speakers',
        operation: '$in',
      }),
      sub_categories: $lookup({
        from: 'categories',
        refFrom: 'name',
        refTo: 'sub_categories',
        select: 'title type name',
        reName: 'sub_categories',
        operation: '$in',
      }),
      company_sponsors: $lookup({
        from: 'companies',
        refFrom: 'slug',
        refTo: 'company_sponsors',
        select: 'name avatar slug urls',
        reName: 'company_sponsors',
        operation: '$in',
      }),
      fund_sponsors: $lookup({
        from: 'companies',
        refFrom: 'slug',
        refTo: 'fund_sponsors',
        select: 'name avatar slug urls',
        reName: 'fund_sponsors',
        operation: '$in',
      }),
      person_sponsors: $lookup({
        from: 'persons',
        refFrom: 'slug',
        refTo: 'person_sponsors',
        select: 'name avatar slug urls',
        reName: 'person_sponsors',
        operation: '$in',
      }),
      asset_price: $lookup({
        from: 'asset-price',
        refFrom: 'slug',
        refTo: 'slug',
        select: 'market_data',
        reName: 'asset-price',
        operation: '$eq',
      }),
      portfolio_companies: $lookup({
        from: 'companies',
        refFrom: 'slug',
        refTo: 'portfolio_companies',
        select: 'name avatar slug',
        reName: 'portfolio_companies',
        operation: '$in',
      }),
      portfolio_funds: $lookup({
        from: 'funds',
        refFrom: 'slug',
        refTo: 'portfolio_funds',
        select: 'name avatar slug urls',
        reName: 'portfolio_funds',
        operation: '$in',
      }),
      company_investors: $lookup({
        from: 'companies',
        refFrom: 'slug',
        refTo: 'company_investors',
        select: 'name avatar slug urls',
        reName: 'company_investors',
        operation: '$in',
      }),
      firms: $lookup({
        from: 'companies',
        refFrom: 'slug',
        refTo: 'firms',
        select: 'name avatar slug urls',
        reName: 'firms',
        operation: '$in',
      }),
      person_investors: $lookup({
        from: 'persons',
        refFrom: 'slug',
        refTo: 'person_investors',
        select: 'name avatar slug urls',
        reName: 'person_investors',
        operation: '$in',
      }),
      company_projects: $lookup({
        from: 'companies',
        refFrom: 'slug',
        refTo: 'projects',
        select: 'name avatar slug urls',
        reName: 'projects',
        operation: '$in',
      }),
      founders: $lookup({
        from: 'persons',
        refFrom: 'slug',
        refTo: 'founders',
        select: 'name avatar slug urls',
        reName: 'founders',
        operation: '$in',
      }),
      partners: $lookup({
        from: 'persons',
        refFrom: 'slug',
        refTo: 'partners',
        select: 'name avatar slug urls',
        reName: 'partners',
        operation: '$in',
      }),
    };
  }
  get $sets(): {
    country: {
      $set: {
        country: { $first: '$country' };
      };
    };
    author: {
      $set: {
        author: { $first: '$author' };
      };
    };
    trans: {
      $set: {
        trans: { $first: '$trans' };
      };
    };
    asset_price: {
      $set: {
        market_data: { $first: '$asset-price.market_data' };
      };
    };
  } {
    return {
      country: {
        $set: {
          country: { $first: '$country' },
        },
      },
      author: {
        $set: {
          author: { $first: '$author' },
        },
      },
      trans: {
        $set: {
          trans: { $first: '$trans' },
        },
      },
      asset_price: {
        $set: {
          market_data: { $first: '$asset-price.market_data' },
        },
      },
    };
  }
  get $addFields(): {
    categories: any;
    sub_categories: any;
    products: any;
    projects: any;
    cryptocurrencies: any;
    portfolio_companies: any;
    portfolio_funds: any;
    company_investors: any;
    person_investors: any;
    company_projects: any;
    founders: any;
    partners: any;
    firms: any;
  } {
    return {
      categories: {
        categories: {
          $cond: {
            if: {
              $ne: [{ $type: '$categories' }, 'array'],
            },
            then: [],
            else: '$categories',
          },
        },
      },
      sub_categories: {
        sub_categories: {
          $cond: {
            if: {
              $ne: [{ $type: '$sub_categories' }, 'array'],
            },
            then: [],
            else: '$sub_categories',
          },
        },
      },
      products: {
        products: {
          $cond: {
            if: {
              $ne: [{ $type: '$products' }, 'array'],
            },
            then: [],
            else: '$products',
          },
        },
      },
      projects: {
        projects: {
          $cond: {
            if: {
              $ne: [{ $type: '$projects' }, 'array'],
            },
            then: [],
            else: '$projects',
          },
        },
      },
      cryptocurrencies: {
        cryptocurrencies: {
          $cond: {
            if: {
              $ne: [{ $type: '$cryptocurrencies' }, 'array'],
            },
            then: [],
            else: '$cryptocurrencies',
          },
        },
      },
      portfolio_companies: {
        portfolio_companies: {
          $cond: {
            if: {
              $ne: [{ $type: '$portfolio_companies' }, 'array'],
            },
            then: [],
            else: '$portfolio_companies',
          },
        },
      },
      portfolio_funds: {
        portfolio_funds: {
          $cond: {
            if: {
              $ne: [{ $type: '$portfolio_funds' }, 'array'],
            },
            then: [],
            else: '$portfolio_funds',
          },
        },
      },
      company_investors: {
        company_investors: {
          $cond: {
            if: {
              $ne: [{ $type: '$company_investors' }, 'array'],
            },
            then: [],
            else: '$company_investors',
          },
        },
      },
      person_investors: {
        person_investors: {
          $cond: {
            if: {
              $ne: [{ $type: '$person_investors' }, 'array'],
            },
            then: [],
            else: '$person_investors',
          },
        },
      },

      company_projects: {
        projects: {
          $cond: {
            if: {
              $ne: [{ $type: '$projects' }, 'array'],
            },
            then: [],
            else: '$projects',
          },
        },
      },
      founders: {
        founders: {
          $cond: {
            if: {
              $ne: [{ $type: '$founders' }, 'array'],
            },
            then: [],
            else: '$founders',
          },
        },
      },
      partners: {
        partners: {
          $cond: {
            if: {
              $ne: [{ $type: '$partners' }, 'array'],
            },
            then: [],
            else: '$partners',
          },
        },
      },
      firms: {
        firms: {
          $cond: {
            if: {
              $ne: [{ $type: '$firms' }, 'array'],
            },
            then: [],
            else: '$firms',
          },
        },
      },
    };
  }

  constructor({
    collectionName,
    _keys,
    indexes,
  }: {
    collectionName: keyof typeof COLLECTION_NAMES;
    _keys: string[];
    indexes: {
      field: {
        [key: string]: IndexDirection;
      };
      options?: CreateIndexesOptions;
    }[];
  }) {
    this._keys = uniq([..._keys, ...this._defaultKeys]);
    this._collectionName = collectionName;
    this._collection = this.db.collection<any>(collectionName);
    // Promise.allSettled(
    //   indexes.map(
    //     ({
    //       field,
    //       options = {},
    //     }: {
    //       field: {
    //         [key: string]: IndexDirection;
    //       };
    //       options?: CreateIndexesOptions;
    //     }) => {
    //       return this._collection.createIndex(field, options);
    //     },
    //   ),
    // ).then((results) => {
    //   results.forEach((result) => {
    //     if (result.status === 'rejected') {
    //       this.logger.error(`error`, `[createIndex:${this._collectionName}:error]`, result.reason);
    //       throwErr(this.error('common.database'));
    //     } else {
    //       // this.logger.debug('success', `[createIndex:${this._collectionName}:success]`, result.value);
    //     }
    //   });
    //   this.logger.debug('success', `[createIndex:${this._collectionName}]`);
    // });
  }

  /**
   * Create document
   * @param {any} Filter - filter
   * @param {any} Body - body
   * @param {FindOneAndUpdateOptions} Options - options
   * @returns {Promise<WithId<T> | null> }- WithId<T> | null
   */
  async create(
    { ...filter }: any,
    { updated_at = new Date(), created_at = new Date(), deleted = false, created_by, ..._content }: any,
    { upsert = true, returnDocument = 'after', ...options }: FindOneAndUpdateOptions = {},
  ): Promise<WithId<T> | null> {
    try {
      _content = await this._validate(_content);
      const {
        value,
        ok,
        lastErrorObject: { updatedExisting },
      } = await this._collection.findOneAndUpdate(
        { ...filter },
        {
          $setOnInsert: {
            ..._content,
            created_by,
            created_at,
            updated_at,
            deleted,
          },
        },
        {
          upsert,
          returnDocument,
          ...options,
        },
      );
      if (!ok) {
        throwErr(this.error('common.database'));
      }
      if (updatedExisting) {
        throwErr(
          this.error('common.already_exist', [
            {
              path: Object.keys(omit(filter, PRIVATE_KEYS)).join(','),
              message: `${Object.values(omit(filter, PRIVATE_KEYS)).join(',')} already exist`,
            },
          ]),
        );
      }
      this.logger.debug('create_success', `[create:${this._collectionName}:success]`, { _content });
      return value;
    } catch (err) {
      this.logger.error('create_error', `[create:${this._collectionName}:error]`, err.message);
      throw err;
    }
  }
  /**
   * Update document
   * @param {any} - filter
   * @param {any} - body
   * @param {FindOneAndUpdateOptions} - options
   * @returns {Promise<WithId<T> | null>} - WithId<T> | null
   */
  async update(
    { ...filter }: any,
    { $set: { updated_at = new Date(), updated_by, ..._content }, ..._updateFilter }: any,
    { upsert = false, returnDocument = 'after', ...options }: FindOneAndUpdateOptions = {},
  ): Promise<WithId<T> | null> {
    try {
      _content = await this._validate(_content);
      const {
        value,
        ok,
        lastErrorObject: { updatedExisting },
      } = await this._collection.findOneAndUpdate(
        $toMongoFilter(filter),
        {
          $set: {
            ..._content,
            updated_at,
            updated_by,
          },
          ..._updateFilter,
        },
        {
          upsert,
          returnDocument,
          ...options,
        },
      );
      if (!ok) {
        throwErr(this.error('common.database'));
      }
      if (!updatedExisting) {
        throwErr(
          this.error('common.not_found', [
            {
              path: Object.keys(omit(filter, PRIVATE_KEYS)).join(','),
              message: `${Object.values(omit(filter, PRIVATE_KEYS)).join(',')} not found`,
            },
          ]),
        );
      }
      this.logger.debug('update_success', `[update:${this._collectionName}:success]`, { _content });
      return value;
    } catch (err) {
      this.logger.error(`update_error`, `[update:${this._collectionName}:error]`, err.message);
      throw err;
    }
  }

  /**
   * Delete document
   * @param _id
   * @param {ObjectId} deleted_by - user id
   * @returns {Promise<void>} - void
   */
  async delete(
    { ...filter },
    { deleted_at = new Date(), deleted_by, deleted = true }: any,
    { upsert = false, returnDocument = 'after', ...options }: FindOneAndUpdateOptions = {},
  ): Promise<void> {
    try {
      const {
        value,
        ok,
        lastErrorObject: { updatedExisting },
      } = await this._collection.findOneAndUpdate(
        $toMongoFilter(filter),
        {
          $set: {
            deleted,
            deleted_by,
            deleted_at,
          },
        },
        {
          upsert,
          returnDocument,
          ...options,
        },
      );
      if (!ok) {
        throwErr(this.error('common.database'));
      }
      if (!updatedExisting) {
        throwErr(this.error('common.not_found'));
      }
      this.logger.debug('delete_success', `[delete:${this._collectionName}:success]`, { _id: value?._id });
      return;
    } catch (err) {
      this.logger.error('delete_error', `[delete:${this._collectionName}:error]`, err.message);
      throw err;
    }
  }
  /**
   *  Get document
   *  @param {any[]} pipeline - pipeline
   *  @param {AggregateOptions} options - aggregate options
   *  @return {Promise<AggregationCursor<T>>} - AggregationCursor
   */
  get(pipeline: any[] = [], options: AggregateOptions = {}): AggregationCursor<T> {
    try {
      return this._collection.aggregate(pipeline, options);
    } catch (err) {
      this.logger.error('get_error', `[get:${this._collectionName}:error]`, err.message);
      throw err;
    }
  }
  async _validate({ ..._content }: any): Promise<any> {
    try {
      const {
        categories = [],
        sub_categories = [],
        event_tags = [],
        product_tags = [],
        company_tags = [],
        person_tags = [],
        coin_tags = [],
        fund_tags = [],
        speakers = [],
        cryptocurrencies = [],
        blockchains = [],
        country,
        title,
        name,
        slug,
      } = _content;
      categories.length &&
        (await $refValidation({ collection: 'categories', refKey: 'name', list: categories })) &&
        (_content.categories = categories);
      blockchains.length &&
        (await $refValidation({ collection: 'blockchains', list: blockchains })) &&
        (_content.blockchains = blockchains);
      sub_categories.length &&
        (await $refValidation({
          collection: 'categories',
          list: sub_categories,
          Refname: 'sub_categories',
          refKey: 'name',
        })) &&
        (_content.sub_categories = sub_categories);
      event_tags.length &&
        (await $refValidation({ collection: 'events', list: event_tags })) &&
        (_content.event_tags = event_tags);
      product_tags.length &&
        (await $refValidation({ collection: 'products', list: product_tags })) &&
        (_content.product_tags = product_tags);
      company_tags.length &&
        (await $refValidation({ collection: 'companies', list: company_tags })) &&
        (_content.company_tags = company_tags);
      person_tags.length &&
        (await $refValidation({ collection: 'persons', list: person_tags })) &&
        (_content.person_tags = person_tags);
      coin_tags.length &&
        (await $refValidation({ collection: 'assets', list: coin_tags })) &&
        (_content.coin_tags = coin_tags);
      fund_tags.length &&
        (await $refValidation({ collection: 'companies', list: fund_tags })) &&
        (_content.fund_tags = fund_tags);
      cryptocurrencies.length &&
        (await $refValidation({
          collection: 'assets',
          list: cryptocurrencies,
          Refname: 'cryptocurrencies',
        })) &&
        (_content.cryptocurrencies = cryptocurrencies);
      speakers.length &&
        (await $refValidation({ collection: 'persons', list: speakers, Refname: 'speakers' })) &&
        (_content.speakers = speakers);
      country && (await $refValidation({ collection: 'countries', list: [country], refKey: 'code' }));
      title &&
        !slug &&
        (_content.slug = slugify(title, {
          trim: true,
          lower: true,
          remove: RemoveSlugPattern,
        }));
      name &&
        !slug &&
        (_content.slug = slugify(name, {
          trim: true,
          lower: true,
          remove: RemoveSlugPattern,
        }));
      return _content;
    } catch (err) {
      this.logger.error('validate_error', `[validate:${this._collectionName}:error]`, err.message);
      throw err;
    }
  }
}
