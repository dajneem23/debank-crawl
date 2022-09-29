import { Container, Service } from 'typedi';
import httpStatusCode from 'http-status';
import { Controller, Post, Res, Req, Next, Delete, Params } from '@/utils/expressDecorators';
import { Response, Request, NextFunction } from 'express';
import { protect } from '@/api/middlewares/protect';
import { uploadImageHandler } from '@/modules/storage/storage.util';
import { StorageError } from '@/modules/storage/storage.error';
import { DIS3BucketClient } from '../../loaders/awsS3Loader';
import { COLLECTION_NAMES } from '@/types';

@Service()
@Controller('/')
export default class StorageController {
  @Post('/upload/images', [protect()])
  async uploadFile(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    const s3BucketClient = Container.get(DIS3BucketClient);
    uploadImageHandler(req, res, async (err) => {
      try {
        if (err) {
          if (err.code === 'LIMIT_FILE_SIZE') return next(new StorageError('IMAGE_TOO_LARGE'));
          return next(err);
        }
        const { folder } = req.body;
        const { file } = req;
        if (!file) return next(new StorageError('NO_FILE_UPLOADED'));
        if (!COLLECTION_NAMES[folder as keyof typeof COLLECTION_NAMES]) {
          return next(new StorageError('FOLDER_NOT_FOUND'));
        }
        const result = await s3BucketClient.uploadPublicFile(file.buffer, {
          prefixPath: `wikiblock/${folder && `${folder}/`}images`,
          originalname: file.originalname,
        });
        res.status(httpStatusCode.CREATED).json(result);
      } catch (err) {
        next(err);
      }
    });
  }
  @Delete('/files', [protect()])
  async deleteFile(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    const s3BucketClient = Container.get(DIS3BucketClient);
    try {
      const { key } = req.body;
      await s3BucketClient.deleteFile(key);
      res.status(httpStatusCode.NO_CONTENT).json();
    } catch (err) {
      next(err);
    }
  }
}
