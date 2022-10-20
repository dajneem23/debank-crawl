import { BaseInformationModel } from '@/types';

export interface FundraisingRound extends BaseInformationModel {
  project: string; // <project_slug>
  type: FundraisingRoundType | string;
  description?: string;
  amount?: number;
  date?: Date;
  categories: Array<string>;
  sub_categories: Array<string>;
  stages?: Array<FundraisingRoundStage>;
  announcements: Array<string>;
  //additional fields
  anum?: string;
  number_of_rounds?: string;
  valuation?: string;
  round_name?: string;
}

export enum FundraisingRoundType {
  FUND = 'FUND',
  COMPANY = 'COMPANY',
}

export enum FundraisingRoundStage {
  UNKNOWN = 'Unknown',
  PRE_SEED = 'Pre-Seed',
  SEED = 'Seed',
  ANGEL = 'Angel',
  BRIDGE = 'Bridge',
  MEZZABINE = 'Mezzanine',
  PRE_PUBLIC = 'Pre-Public',
  PUBLIC = 'Public',
  SERIES_A = 'Series A',
  SERIES_B = 'Series B',
  SERIES_C = 'Series C',
  SERIES_D = 'Series D',
  SERIES_E = 'Series E',
  SERIES_F = 'Series F',
  INVESTORS = 'Investors',
  DEBT_FINANCING = 'DEBT Financing',
  TREASURY_DIVERSIFICATION = 'Treasury Diversification',
  EXTENDED_SERIES_A = 'Extended Series A',
  EXTENDED_SERIES_B = 'Extended Series B',
}
