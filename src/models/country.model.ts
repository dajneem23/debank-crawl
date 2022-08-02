import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { EventModel } from './event.model';
@Entity('country')
export class CountryModel {
  // id - primary id unique
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;
  // Title
  @Column('varchar', { name: 'name', length: 255 })
  name: string;

  @OneToMany(() => EventModel, (event) => event.category)
  events: Array<EventModel>;

  // Record created at
  @Column('timestamp', { name: 'created_at' })
  createdAt: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt: Date;
}
