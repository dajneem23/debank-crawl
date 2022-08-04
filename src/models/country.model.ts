import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { EventModel } from './event.model';
@Entity('country', { synchronize: true })
export class CountryModel {
  // id - primary id unique
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;
  // Title
  @Column('varchar', { name: 'name', length: 255 })
  name: string;

  @OneToMany(() => EventModel, (event) => event.country)
  events: EventModel[];

  @Column('varchar', { name: 'code', length: 255, unique: true })
  code: string;

  // Record created at
  @Column('timestamp', { name: 'created_at' })
  createdAt: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true, onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
