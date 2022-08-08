import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { CategoryModel, CompanyModel, PersonModel, ProductModel, SectorModel } from '../models';
@Entity('project', { synchronize: true })
export class ProjectModel {
  // id - primary id unique
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;
  // name
  @Column('varchar', { name: 'name' })
  name: string;

  @ManyToOne(() => CompanyModel, (company) => company.persons)
  @JoinColumn({ name: 'company_id' })
  companyId: string;

  @OneToMany(() => ProductModel, (product) => product.projectId)
  products: ProductModel[];

  // @ManyToMany(() => PersonModel)
  // @JoinTable({
  //   name: 'project_persons',
  //   joinColumn: { name: 'project_id', referencedColumnName: 'id' },
  //   inverseJoinColumn: { name: 'person_id', referencedColumnName: 'id' },
  // })
  // persons: PersonModel[];

  @ManyToMany(() => SectorModel)
  @JoinTable({
    name: 'project_sectors',
    joinColumn: { name: 'project_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'sector_id', referencedColumnName: 'id' },
  })
  sectors: SectorModel[];

  @ManyToMany(() => CategoryModel)
  @JoinTable({
    name: 'project_categories',
    joinColumn: { name: 'project_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories: CategoryModel[];

  @Column({ name: 'token', length: 255 })
  token: string;

  @Column({ name: 'stacking_apr' })
  stakingAPR: number;

  @Column({ name: 'hash_algorithm' })
  hashAlgorithm: string;

  @Column({ name: 'inflation' })
  inflation: number;

  @Column({ name: 'structure' })
  structure: string;

  @Column({ name: 'development_status' })
  developmentStatus: string;

  @Column({ name: 'avatar', nullable: true })
  avatar: string;

  @Column({ name: 'summary', nullable: true })
  summary: string;

  @Column({ name: 'review', nullable: true })
  review: string;

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

  @Column({ name: 'whitepaper', nullable: true })
  whitepaper: string;

  @Column({ name: 'explorer', nullable: true })
  explorer: string;

  // Record created at
  @Column('timestamp', { name: 'created_at' })
  createdAt?: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt?: Date;
}
