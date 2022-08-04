import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('crypto_asset_tag', { synchronize: true })
export class CryptoAssetTagModel {
  // id - primary id unique
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;
  // Name
  @Column('varchar', { name: 'name', length: 255 })
  name: string;

  @Column('boolean', { name: 'is_show', default: true })
  isShow: boolean;

  // Record created at
  @Column('timestamp', { name: 'created_at' })
  createdAt: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt: Date;
}
