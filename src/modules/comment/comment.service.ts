import Container, { Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { toOutPut } from '@/utils/common';
import { $toMongoFilter } from '@/utils/mongoDB';
import { CommentModel, commentModelToken } from '.';
import { BaseServiceInput, BaseServiceOutput } from '@/types/Common';
import { ObjectId } from 'mongodb';

const TOKEN_NAME = '_commentService';
export const CommentServiceToken = new Token<CommentService>(TOKEN_NAME);
/**
 * @class CommentService
 * @description Comment service: Comment service for all comment related operations
 * @extends BaseService
 */
@Service(CommentServiceToken)
export class CommentService {
  private logger = new Logger('Comment');

  readonly model = Container.get(commentModelToken) as CommentModel;

  get outputKeys(): typeof this.model._keys {
    return this.model._keys;
  }

  get publicOutputKeys() {
    return ['id', 'content', 'create_by', 'created_at'];
  }

  /**
   * Update
   * @param _id
   * @param _content
   * @param _subject
   * @returns {Promise<Comment>}
   */
  async update({ _id, _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const value = await this.model.update(
        $toMongoFilter({
          _id,
        }),
        {
          $set: {
            ..._content,
            ...(_subject && { updated_by: _subject }),
          },
        },
      );
      this.logger.debug('update_success', { value });
      return toOutPut({ item: value, keys: this.outputKeys });
    } catch (err) {
      this.logger.error('update_error', err.message);
      throw err;
    }
  }
  /**
   * Delete
   * @param _id
   * @param {ObjectId} _subject
   * @returns {Promise<void>}
   */
  async delete({ _id, _subject }: BaseServiceInput): Promise<void> {
    try {
      await this.model.delete(
        { _id },
        {
          ...(_subject && { deleted_by: _subject }),
        },
      );
      this.logger.debug('delete_success', { _id });
      return;
    } catch (err) {
      this.logger.error('delete_error', err.message);
      throw err;
    }
  }

  /**
   * create
   * @param {ObjectId} _subject
   * @returns {Promise<void>}
   */
  async create({ _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const value = await this.model.create(
        {
          _id: new ObjectId(),
        },
        {
          ..._content,
          ...(_subject && { created_by: _subject }),
        },
      );
      this.logger.debug('create_success', JSON.stringify(_content));
      return toOutPut({ item: value, keys: this.outputKeys });
    } catch (err) {
      this.logger.error('create_error', err.message);
      throw err;
    }
  }
}
