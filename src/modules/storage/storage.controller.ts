import { Container, Service } from 'typedi';
import httpStatusCode from 'http-status';
import { Controller, Post, Res, Req, Next } from '@/utils/expressDecorators';
import { Response, Request, NextFunction } from 'express';
import { protect } from '@/api/middlewares/protect';
import { uploadImageHandler } from '@/modules/storage/storage.util';
import { StorageError } from '@/modules/storage/storage.error';
import { DIS3BucketClient } from '../../loaders/awsS3Loader';

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
        if (!req.file) return next(new StorageError('NO_FILE_UPLOADED'));
        const result = await s3BucketClient.uploadPublicFile(req.file.buffer, {
          prefixPath: 'images',
          originalname: req.file.originalname,
        });
        res.status(httpStatusCode.CREATED).json(result);
      } catch (err) {
        next(err);
      }
    });
  }
}
