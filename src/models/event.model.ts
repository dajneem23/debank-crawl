import { Entity, Column, OneToOne, ManyToMany, OneToMany, JoinTable, JoinColumn } from 'typeorm';
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

  @Column('jsonb', { nullable: true, name: 'social_profiles' })
  socialProfiles: object[]; //   Social Profile

  @Column('jsonb', { nullable: true })
  news: object[]; //   News

  @Column('jsonb', { nullable: true })
  map: object; // Map API

  @OneToOne(() => NoTable)
  @JoinColumn({ name: 'no_table_id' })
  noTable: NoTable; // entity: noTable

  @OneToMany(() => Agenda, (agenda) => agenda.eventId)
  @JoinColumn({ name: 'event_id' })
  agendas: Agenda[]; // entity: Agenda (array)

  @ManyToMany(() => Person, (person) => person.id)
  @JoinTable({
    name: 'event_speakers',
    joinColumn: { name: 'event_id' },
    inverseJoinColumn: { name: 'speaker_id' },
  })
  speakers: Person[]; // entity: Person (array)

  @ManyToMany(() => Person, (person) => person.id)
  @JoinTable({
    name: 'event_sponsors',
    joinColumn: { name: 'event_id' },
    inverseJoinColumn: { name: 'sponsors_id' },
  })
  sponsors: Person[]; // entity: Person (array)
}
