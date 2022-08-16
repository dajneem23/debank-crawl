import { BaseInformationModel, Feature, ContractAddress } from '@/types/Common';

export interface Product extends BaseInformationModel {
  name: string;

  director: string;

  contract_addresses: Array<ContractAddress>;

  crypto_currencies?: Array<string>;

  //array id of categories
  categories?: Array<string>;

  software_license: string;

  features?: Array<string>;

  ccys?: Array<string>;

  token: string;

  ios_app: string;

  google_play_app: string;

  chrome_extension: string;

  mac_app: string;

  linux_app: string;

  windows_app: string;

  wiki: string;
}
