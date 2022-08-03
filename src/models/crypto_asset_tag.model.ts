import { CATEGORY_TYPE } from '../types/Common';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { EventModel } from './event.model';

@Entity('crypto_asset_tag', { synchronize: true })
export class CryptoAssetTagModel {
  // id - primary id unique
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;
  // Name
  @Column('varchar', { name: 'name', length: 255 })
  name: string;

  // Record created at
  @Column('timestamp', { name: 'created_at' })
  createdAt: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt: Date;
}
