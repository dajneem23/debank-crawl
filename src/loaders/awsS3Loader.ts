import { Container, Token } from 'typedi';
import { DILogger } from '@/loaders/loggerLoader';
import env from '@/config/env';
import S3BucketClient from '@/modules/storage/S3BucketClient';
import { SystemError } from '@/core/errors/CommonError';

export const DIS3BucketClient = new Token<S3BucketClient>('DIS3BucketClient');

const awsS3Loader = async () => {
  const logger = Container.get(DILogger);
  const bucketClient = new S3BucketClient(env.AWS_S3_BUCKET, {
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
  if (!(await bucketClient.isExists())) {
    throw new SystemError('S3 Bucket does not exists');
  }
  Container.set(DIS3BucketClient, bucketClient);
  logger.success('load_success', `AWS S3 loaded (Bucket: ${bucketClient.name})`);
  return bucketClient;
};

export default awsS3Loader;
