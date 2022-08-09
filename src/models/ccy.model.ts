import { PrimaryGeneratedColumn, Column, Entity } from 'typeorm';
@Entity('ccy', { synchronize: true })
export class CCYModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  // Record created at
  @Column('timestamp', { name: 'created_at' })
  createdAt?: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt?: Date;
}
