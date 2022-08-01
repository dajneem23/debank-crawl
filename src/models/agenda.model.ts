import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Event } from '../models/event.model';
import { BaseModel } from './base.model';
@Entity()
export class Agenda extends BaseModel {
  static MODEL_NAME = 'agendas';

  @Column()
  @ManyToOne(() => Event, (event) => event.agendas)
  event_id: string;

  @Column('time')
  time: Date;

  @Column()
  description: string;
}
