import { Entity, Column, ManyToMany, JoinTable, JoinColumn, PrimaryGeneratedColumn, ManyToOne, Index } from 'typeorm';
import { EventType } from '../modules/event/event.type';
import { SpeakerModel, SponsorModel, CryptoAssetTagModel, CountryModel, CategoryModel } from '../models';
@Entity('event')
export class EventModel {
  // id - primary id unique
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column('enum', { name: 'type', enum: EventType })
  type: EventType;

  @Column({ name: 'name', nullable: true })
  @Index()
  name: string;

  @Column({ name: 'introduction', nullable: true })
  introduction: string;

  @Column('jsonb', { nullable: true })
  medias: object; //    media

  @Column('jsonb', { nullable: true })
  agenda: object; //    agenda

  @Column('jsonb', { nullable: true, name: 'social_profiles' })
  socialProfiles: object; //   Social Profile

  @Column('jsonb', { nullable: true })
  map: object; // Map API

  @Column('timestamp', { name: 'start_date' })
  startDate: Date;

  @Column('timestamp', { name: 'end_date' })
  endDate: Date;

  @Column('varchar', { name: 'phone' })
  phone: string;

  @Column('varchar', { name: 'website' })
  website: string;

  @Column({ name: 'reddit', nullable: true })
  reddit: string;

  @ManyToMany(() => CategoryModel)
  @JoinTable({
    name: 'event_categories',
    joinColumn: { name: 'event_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories: CategoryModel[];

  @ManyToMany(() => CryptoAssetTagModel)
  @JoinTable({
    name: 'event_crypto_asset_tags',
    joinColumn: {
      name: 'event_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'crypto_asset_tag_id',
      referencedColumnName: 'id',
    },
  })
  cryptoAssetTags: CryptoAssetTagModel[];

  @ManyToOne(() => CountryModel, (country) => country.events)
  @JoinColumn({ name: 'country_id' })
  country: CountryModel;

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

  // Record created at
  @Column('timestamp', { name: 'created_at' })
  createdAt?: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt?: Date;
}
