import { Entity, Column, OneToOne, PrimaryGeneratedColumn, ManyToMany, OneToMany, JoinTable } from 'typeorm';
import { EventCategory } from '../modules/event/event.type';
import { Agenda } from '../models/agenda.model';
import { Person } from '../models/person.model';
import { NoTable } from './noTable.model';
import { BaseModel } from './base.model';
@Entity()
export class Event extends BaseModel {
  static MODEL_NAME = 'events';

  @Column()
  information: string;

  @Column()
  introduction: string;

  @Column({
    type: 'enum',
    enum: EventCategory,
  })
  category: EventCategory;

  @Column('jsonb', { nullable: true })
  medias: object; //    media

  @Column('jsonb', { nullable: true })
  social_profiles: object[]; //   Social Profile

  @Column('jsonb', { nullable: true })
  news: object[]; //   News

  @Column('jsonb', { nullable: true })
  map: object; // Map API

  @OneToOne(() => NoTable)
  no_table: NoTable; // entity: noTable

  @OneToMany(() => Agenda, (agenda) => agenda.event_id)
  agendas: Agenda[]; // entity: Agenda (array)

  @JoinTable()
  @ManyToMany(() => Person, (person) => person.id)
  speakers: Person[]; // entity: Person (array)

  @JoinTable()
  @ManyToMany(() => Person, (person) => person.id)
  sponsors: Person[]; // entity: Person (array)
}
