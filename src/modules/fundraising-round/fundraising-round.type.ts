import { BaseInformationModel } from '@/types';

export interface FundraisingRound extends BaseInformationModel {
  project: string; // <project_slug>

  name: string;

  asset: string; // <asset_slug> -> bitcoin, ethereum, etc

  lead_funds?: string; // fund_slug  "andreessen-horowitz" -> funds collection

  funds: string[]; // fund_slug  "andreessen-horowitz" -> funds collection

  company: string; // company_slug  "dora-factory" -> companies collection

  description?: string;

  amount?: number;

  date?: Date;

  categories: Array<string>;

  sub_categories: Array<string>;

  stage?: Array<FundraisingRoundStage>;

  announcements: Array<string>;

  //additional fields

  founders: string[]; // person_slug =>  ["prabhakar-reddy","raghu-yarlagadda"]

  investors: string[]; //      ["accel","coinbase-ventures","cmt-digital"] // person or company
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
