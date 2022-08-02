import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
@Entity('sponsor')
export class SponsorModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column()
  name: string;

  @Column()
  logo: string;

  @Column('timestamp', { name: 'created_at' })
  createdAt: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt: Date;
}
