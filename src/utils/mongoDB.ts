import { Filter, ObjectId, ReadPreference, TransactionOptions, WithTransactionCallback } from 'mongodb';
import { Container } from 'typedi';
import { DIMongoClient } from '@/loaders/mongoDBLoader';
import { DILogger } from '@/loaders/loggerLoader';
import { isNull, omitBy } from 'lodash';
import { defaultFilter } from '@/types/Common';

const transactionOptions: TransactionOptions = {
  readPreference: ReadPreference.primary,
  readConcern: { level: 'local' },
  writeConcern: { w: 'majority' },
};

/**
 * Runs a provided lambda within a transaction, retrying either the commit operation
 * or entire transaction as needed (and when the error permits) to better ensure that
 * the transaction can complete successfully.
 *
 * IMPORTANT: This method requires the user to return a Promise, all lambdas that do not
 * return a Promise will result in undefined behavior.
 *
 * @param fn - A lambda to run within a transaction
 */
export const withMongoTransaction = async (fn: WithTransactionCallback) => {
  const mongoClient = Container.get(DIMongoClient);
  const logger = Container.get(DILogger);
  // Mongo client session
  const session = mongoClient.startSession();
  try {
    const results = await session.withTransaction(fn, transactionOptions);
    logger.debug('[session:success]', { results });
    return results;
  } catch (err) {
    logger.error('[session:error]', err);
    throw err;
  } finally {
    await session.endSession();
    logger.debug('[session:end]');
  }
};

export const $lookup = ({
  from,
  refFrom,
  refTo,
  select,
  reName,
  condition,
  operation = ' $eq',
}: {
  from: string;
  refFrom: string;
  refTo: string;
  select: string;
  reName: string;
  operation?: string;
  condition?: object;
}) => ({
  $lookup: {
    from,
    let: {
      [refTo]: `$${refTo}`,
    },
    pipeline: [
      {
        $match: {
          $expr: {
            [operation]: [`$${refFrom}`, `$$${refTo}`],
          },
          ...(!!condition && {
            ...condition,
          }),
        },
      },
      {
        $project: {
          _id: 0,
          id: '$_id',
          ...select.split(/[,\s]/).reduce((previous: any, current: any) => {
            previous[current] = 1;
            return previous;
          }, {}),
        },
      },
    ],
    as: reName,
  },
});

export const $query = function ({
  $match,
  pipeline,
}: {
  $match: {
    [key: string]: any;
  };
  pipeline: any[];
}) {
  // eslint-disable-next-line array-callback-return
  Object.keys($match).map((key) => {
    $match[key] = /_id/.test(key) && $match[key] && $match[key].length === 24 ? new ObjectId($match[key]) : $match[key];
  });
  return [
    {
      $match,
    },
    ...pipeline,
  ];
};

export const $pagination = ({
  $match,
  pipeline,
  lookups,
  condition,
}: {
  $match: any;
  pipeline: any[];
  lookups: any[];
  condition: any[];
}) => {
  // Convert _id to ObjectId
  Object.keys($match).map(
    (key) => ($match[key] = /_id/.test(key) && !$match[key].$in ? new ObjectId($match[key]) : $match[key]),
  );
  return [
    {
      $match,
    },
    ...(!!lookups && [...lookups]),
    ...(!!condition && [...condition]),

    {
      $facet: {
        total_count: [
          {
            $count: 'total_count',
          },
        ],
        items: pipeline,
      },
    },
    { $project: { result: { $concatArrays: ['$total_count', '$items'] } } },
    { $unwind: '$result' },
    { $replaceRoot: { newRoot: '$result' } },
  ];
};

export const $toObjectId = (ids: any[]) => ids.map((id) => new ObjectId(id));

export const $toMongoFilter = ({ _id, nullable = false, ...filter }: any): Filter<any> => {
  if (_id && !ObjectId.isValid(_id)) {
    throw new Error('Invalid ObjectId');
  }
  const _idFilter = _id ? { _id: new ObjectId(_id) } : {};
  return nullable
    ? { ..._idFilter, ...filter, ...defaultFilter }
    : omitBy({ ..._idFilter, ...filter, ...defaultFilter }, isNull);
};
