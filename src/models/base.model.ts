import {
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  VersionColumn,
  DeleteDateColumn,
  BaseEntity,
} from 'typeorm';

export abstract class BaseModel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  @VersionColumn()
  _v: number;
}
