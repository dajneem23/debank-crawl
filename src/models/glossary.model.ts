import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
@Entity('glossary', { synchronize: true })
export class GlossaryModel {
  // id - primary id unique
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column('varchar', { name: 'name' })
  name: string;

  @Column('varchar', { name: 'define' })
  define: string;

  // Record created at
  @Column('timestamp', { name: 'created_at' })
  createdAt: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt: Date;
}
