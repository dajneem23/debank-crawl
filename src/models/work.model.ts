import { PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Entity } from 'typeorm';
import { PersonModel } from '.';
import { WorkType } from '../modules/work';
@Entity('work', { synchronize: true })
export class WorkModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ name: 'type', type: 'enum', enum: WorkType })
  type: WorkType;

  @Column('timestamp', { name: 'created_at' })
  createdAt?: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt?: Date;
}
