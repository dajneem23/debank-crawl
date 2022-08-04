import { FindOperator } from 'typeorm';

export interface CryptoAssetTag {
  // id - primary id unique
  id?: string;
  // Name
  name?: string;

  createdAt?: Date | FindOperator<Date>;

  updatedAt?: Date | FindOperator<Date>;
}
