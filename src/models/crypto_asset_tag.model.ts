import { CATEGORY_TYPE } from '../types/Common';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { EventModel } from './event.model';

@Entity('crypto_asset_tag')
export class CryptoAssetTagModel {
  // id - primary id unique
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;
  // Name
  @Column('varchar', { name: 'name', length: 255 })
  name: string;

  @ManyToMany(() => EventModel)
  @JoinTable({
    name: 'event_tag',
    joinColumn: {
      name: 'tag_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'event_id',
      referencedColumnName: 'id',
    },
  })

  // Record created at
  @Column('timestamp', { name: 'created_at' })
  createdAt: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt: Date;
}
