import { PrimaryGeneratedColumn, Column, Entity } from 'typeorm';
@Entity('support', { synchronize: true })
export class SupportModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  detail: string;

  @Column()
  description: string;

  @Column('timestamp', { name: 'created_at' })
  createdAt?: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt?: Date;
}
