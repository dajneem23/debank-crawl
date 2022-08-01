import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Event } from '../models/event.model';
import { BaseModel } from './base.model';
@Entity()
export class Agenda extends BaseModel {
  static MODEL_NAME = 'agendas';

  @ManyToOne(() => Event, (event) => event.agendas)
  @JoinColumn({ name: 'event_id' })
  eventId: string;

  @Column('time')
  time: Date;

  @Column()
  description: string;
}
