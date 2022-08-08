import { PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Entity } from 'typeorm';
@Entity('education', { synchronize: true })
export class EducationModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column('timestamp', { name: 'created_at' })
  createdAt?: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt?: Date;
}
