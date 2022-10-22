export interface Comment {
  _id?: string;
  content_id?: string;
  content?: string;
  reacts?: Array<string>;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}
