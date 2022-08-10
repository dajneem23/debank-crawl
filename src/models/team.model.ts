import { PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Entity } from 'typeorm';
import { CompanyModel } from '../models';
@Entity('team', { synchronize: true })
export class TeamModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => CompanyModel, (company) => company.teams)
  @JoinColumn({ name: 'company_id' })
  companyId: string;

  // Record created at
  @Column('timestamp', { name: 'created_at' })
  createdAt?: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt?: Date;
}
