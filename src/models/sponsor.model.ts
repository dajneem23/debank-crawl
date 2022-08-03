import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
@Entity('sponsor')
export class SponsorModel {
  // id - primary id unique
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column()
  name: string;

  @Column()
  logo: string;

  // Record created at
  @Column('timestamp', { name: 'created_at' })
  createdAt: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt: Date;
}
