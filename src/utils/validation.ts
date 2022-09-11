import { CommonError } from '@/types';
import { throwErr } from './common';
import { $queryByList } from './mongoDB';
import { ValidateError } from '@/core/errors/ValidateError';

export const categoriesValidation = async (categories: []) => {
  (await $queryByList({ collection: 'categories', values: categories })) ||
    throwErr(new ValidateError('category:not_found'));
};
