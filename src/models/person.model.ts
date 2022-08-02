import { Entity, Column } from 'typeorm';
import { BaseModel } from './base.model';
@Entity()
export class Person extends BaseModel {
  static MODEL_NAME = 'persons';

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column()
  address: string;

  @Column()
  avatar: string;

  @Column()
  position: string;

  @Column()
  company: string;

  @Column('jsonb', { nullable: true, name: 'social_profiles' })
  socialProfiles: object[]; //   Social Profile
}
