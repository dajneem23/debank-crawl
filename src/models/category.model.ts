import { CATEGORY_TYPE } from '../types/Common';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
@Entity('category', { synchronize: false })
export class CategoryModel {
  // id - primary id unique
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;
  // Title
  @Column('varchar', { name: 'title', length: 255 })
  title: string;
  // type
  @Column('enum', { name: 'type', enum: CATEGORY_TYPE })
  type: CATEGORY_TYPE;
  // URL reference
  @Column('int', { name: 'weight' })
  weight: number;

  // Record created at
  @Column('timestamp', { name: 'created_at' })
  createdAt: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt: Date;
}
