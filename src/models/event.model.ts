import {
  Entity,
  Column,
  ManyToMany,
  OneToMany,
  JoinTable,
  JoinColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
} from 'typeorm';
import { CategoryModel } from './category.model';
import { CountryModel } from './country.model';

import { SpeakerModel } from './speaker.model';
import { SponsorModel } from './sponsor.model';
@Entity('event')
export class EventModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  introduction: string;

  @Column('jsonb', { nullable: true })
  medias: object; //    media

  @Column('jsonb', { nullable: true })
  agenda: object; //    agenda

  @Column('jsonb', { nullable: true, name: 'social_profiles' })
  socialProfiles: object; //   Social Profile

  @Column('jsonb', { nullable: true })
  map: object; // Map API

  @Column('time', { name: 'start_time' })
  startDate: Date;

  @Column('time', { name: 'end_date' })
  endDate: Date;

  @Column('varchar', { name: 'phone' })
  phone: string;

  @Column('varchar', { name: 'website' })
  website: string;

  @ManyToOne(() => CategoryModel, (category) => category.events)
  @JoinColumn({ name: 'category_id' })
  category: CategoryModel;

  @ManyToOne(() => CountryModel, (country) => country.events)
  @JoinColumn({ name: 'country_id' })
  country: CountryModel;

  @Column()
  location: string;

  @ManyToMany(() => SpeakerModel)
  @JoinTable({
    name: 'event_speakers',
    joinColumn: { name: 'event_id' },
    inverseJoinColumn: { name: 'speaker_id' },
  })
  speakers: SpeakerModel[]; // entity: Person (array)

  @ManyToMany(() => SponsorModel)
  @JoinTable({
    name: 'event_sponsors',
    joinColumn: { name: 'event_id' },
    inverseJoinColumn: { name: 'sponsor_id' },
  })
  sponsors: SponsorModel[]; // entity: Sponsor (array)

  @Column('timestamp', { name: 'created_at' })
  createdAt: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt: Date;
}
