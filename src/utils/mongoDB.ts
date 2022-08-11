import { ReadPreference, TransactionOptions, WithTransactionCallback } from 'mongodb';
import { Container } from 'typedi';
import { DIMongoClient } from '@/loaders/mongoDBLoader';
import { DILogger } from '@/loaders/loggerLoader';

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
