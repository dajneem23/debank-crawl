/* eslint-disable @typescript-eslint/no-unused-vars */
import Container from 'typedi';
import { Controller, Res, Body, Put, Params, Delete, Req, Auth } from '@/utils/expressDecorators';
import { Response, Request } from 'express';
import { Comment, CommentValidation, CommentServiceToken } from '.';
import httpStatus from 'http-status';
import { protectPrivateAPI } from '@/api/middlewares/protect';
import { JWTPayload } from '../auth/authSession.type';
import { BaseServiceInput } from '@/types/Common';

@Controller('/comment')
export class CommentPrivateController {
  private service = Container.get(CommentServiceToken);

  @Put('/:id', [CommentValidation.update])
  async update(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Params() { id }: { id: string },
    @Body()
    body: Comment,
  ) {
    const result = await this.service.update({
      __id: id,
      _content: body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }

  @Delete('/:id', [CommentValidation.delete])
  async delete(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Params() _params: { id: string },
    @Body()
    body: Comment,
  ) {
    await this.service.delete({
      _id: _params.id,
      _content: body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.NO_CONTENT).end();
  }
}
