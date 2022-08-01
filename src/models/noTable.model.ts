import { FormType } from '../modules/noTable/noTable.type';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { BaseModel } from './base.model';
@Entity()
export class NoTable extends BaseModel {
  static MODEL_NAME = 'no_tables';

  @Column('time')
  start_date: Date;

  @Column('time')
  end_date: Date;

  @Column('jsonb', { nullable: true })
  contact: object[];

  @Column()
  location: string;

  @Column({
    type: 'enum',
    enum: FormType,
  })
  form: FormType;

  // @Column()
  // subscribers:Person[]
}
