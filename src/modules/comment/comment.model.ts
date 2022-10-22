import { Service, Token } from 'typedi';
import { Comment } from './comment.type';
import { BaseModel } from '../base/base.model';
import { keys } from 'ts-transformer-keys';
const COLLECTION_NAME = 'comment';
const TOKEN_NAME = '_commentModel';
export const commentModelToken = new Token<CommentModel>(TOKEN_NAME);
/**
 * @class CommentModel
 * @extends BaseModel
 * @description Comment model: Comment model for all comment related operations
 */
@Service(commentModelToken)
export class CommentModel extends BaseModel {
  constructor() {
    super({
      collectionName: COLLECTION_NAME,
      _keys: keys<Comment>(),
      indexes: [],
    });
  }
}
