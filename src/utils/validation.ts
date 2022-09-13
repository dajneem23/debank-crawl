import { CommonError } from '@/types';
import { throwErr } from './common';
import { $queryByList } from './mongoDB';
import { ValidateError } from '@/core/errors/ValidateError';

export const $refValidation = async ({ collection, list }: { collection: string; list: string[] }) => {
  (await $queryByList({ collection: collection, values: list })) || throwErr(new ValidateError('not_found'));
};
