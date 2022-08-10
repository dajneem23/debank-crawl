import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, Index, JoinTable } from 'typeorm';
import { ProductModel, TeamModel, WorkModel, EducationModel } from '../models';
@Entity('person')
export class PersonModel {
  // id - primary id unique
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // products - one to many relation with ProductModel
  @ManyToMany(() => ProductModel)
  products: ProductModel[];

  // companyId - foreign key relation with CompanyModel
  // @ManyToOne(() => CompanyModel, (company) => company.persons)
  // @JoinColumn({ name: 'company_id' })
  // companyId: string;

  @ManyToMany(() => TeamModel)
  @JoinTable({
    name: 'person_teams',
    joinColumn: { name: 'person_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'team_id', referencedColumnName: 'id' },
  })
  teams: TeamModel[];

  @ManyToMany(() => WorkModel)
  @JoinTable({
    name: 'person_works',
    joinColumn: { name: 'person_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'work_id', referencedColumnName: 'id' },
  })
  works: WorkModel[];

  @ManyToMany(() => EducationModel)
  @JoinTable({
    name: 'person_educations',
    joinColumn: { name: 'person_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'education_id', referencedColumnName: 'id' },
  })
  educations: EducationModel[];

  // @OneToMany(() => PhotoModel, (photo) => photo.ownerId)
  // photos: PhotoModel[];

  @Column()
  @Index()
  name: string;

  @Column({ name: 'position', nullable: true })
  position: string;

  @Column({ name: 'avatar', nullable: true })
  avatar: string;

  @Column({ name: 'about', nullable: true })
  about: string;

  @Column({ name: 'education', nullable: true })
  education: string;

  @Column({ name: 'recent_tweet', nullable: true })
  recentTweet: string;

  @Column({ name: 'twitter', nullable: true })
  twitter: string;

  @Column({ name: 'telegram', nullable: true })
  telegram: string;

  @Column({ name: 'facebook', nullable: true })
  facebook: string;

  @Column({ name: 'instagram', nullable: true })
  instagram: string;

  @Column({ name: 'linkedin', nullable: true })
  linkedin: string;

  @Column({ name: 'github', nullable: true })
  github: string;

  @Column({ name: 'medium', nullable: true })
  medium: string;

  @Column({ name: 'youtube', nullable: true })
  youtube: string;

  @Column({ name: 'website', nullable: true })
  website: string;

  @Column({ name: 'blog', nullable: true })
  blog: string;

  @Column({ name: 'reddit', nullable: true })
  reddit: string;

  // Record created at
  @Column('timestamp', { name: 'created_at' })
  createdAt?: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt?: Date;
}
