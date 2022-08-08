import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('blockchain', { synchronize: true })
export class Blockchain {
  // id - primary id unique
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;
  // Name
  @Column('varchar', { name: 'name', length: 255 })
  name: string;

  @Column({ name: 'stacking_apr' })
  stakingAPR: number;

  @Column({ name: 'hash_algorithm' })
  hashAlgorithm: string;

  @Column({ name: 'inflation' })
  inflation: number;

  @Column({ name: 'structure' })
  structure: string;

  @Column({ name: 'development_status' })
  developmentStatus: string;

  // Record created at
  @Column('timestamp', { name: 'created_at' })
  createdAt: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt: Date;
}
