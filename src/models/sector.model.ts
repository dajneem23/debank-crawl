import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
@Entity('sector', { synchronize: true })
export class SectorModel {
  // id - primary id unique
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;
  // Title
  @Column('varchar', { name: 'title', length: 255 })
  title: string;

  @Column('int', { name: 'weight' })
  weight: number;

  // Record created at
  @Column('timestamp', { name: 'created_at' })
  createdAt?: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt?: Date;
}
