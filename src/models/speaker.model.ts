import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
@Entity('speaker')
export class SpeakerModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'email', nullable: true })
  email: string;

  @Column({ name: 'phone', nullable: true })
  phone: string;

  @Column({ name: 'address', nullable: true })
  address: string;

  @Column({ name: 'avatar', nullable: true })
  avatar: string;

  @Column({ name: 'position', nullable: true })
  position: string;

  @Column({ name: 'company', nullable: true })
  company: string;

  @Column('jsonb', { nullable: true, name: 'socials' })
  socialProfiles: object[]; //   Social Profile

  // Record created at
  @Column('timestamp', { name: 'created_at' })
  createdAt: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt: Date;
}
