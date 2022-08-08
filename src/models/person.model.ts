import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, ManyToMany, Index } from 'typeorm';
import { ProductModel, CompanyModel } from '../models';
@Entity('person')
export class PersonModel {
  // id - primary id unique
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // products - one to many relation with ProductModel
  @ManyToMany(() => ProductModel)
  products: ProductModel[];

  // companyId - foreign key relation with CompanyModel
  @ManyToOne(() => CompanyModel, (company) => company.persons)
  @JoinColumn({ name: 'company_id' })
  companyId: string;

  // @OneToMany(() => PhotoModel, (photo) => photo.ownerId)
  // photos: PhotoModel[];

  @Column()
  @Index()
  name: string;

  @Column({ name: 'position', nullable: true })
  position: string;

  @Column({ name: 'avatar', nullable: true })
  avatar: string;

  @Column({ name: 'summary', nullable: true })
  summary: string;

  @Column({ name: 'current_work', nullable: true })
  currentWork: string;

  @Column({ name: 'previous_work', nullable: true })
  previousWork: string;

  @Column({ name: 'education', nullable: true })
  education: string;

  @Column({ name: 'recent_tweet', nullable: true })
  recentTweet: string;

  @Column({ name: 'twitter_url', nullable: true })
  twitterUrl: string;

  @Column({ name: 'telegram_url', nullable: true })
  telegramUrl: string;

  @Column({ name: 'facebook_url', nullable: true })
  facebookUrl: string;

  @Column({ name: 'instagram_url', nullable: true })
  instagramUrl: string;

  @Column({ name: 'linkedin_url', nullable: true })
  linkedinUrl: string;

  @Column({ name: 'github_url', nullable: true })
  githubUrl: string;

  @Column({ name: 'medium_url', nullable: true })
  mediumUrl: string;

  @Column({ name: 'youtube_url', nullable: true })
  youtubeUrl: string;

  @Column({ name: 'website_url', nullable: true })
  websiteUrl: string;

  @Column({ name: 'blog_url', nullable: true })
  blogUrl: string;

  // Record created at
  @Column('timestamp', { name: 'created_at' })
  createdAt?: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt?: Date;
}
