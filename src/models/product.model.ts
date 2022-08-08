import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  OneToMany,
  JoinTable,
} from 'typeorm';
import {
  SponsorModel,
  SectorModel,
  PersonModel,
  GalleryModel,
  CryptocurrencyModel,
  CompanyModel,
  CategoryModel,
  ProjectModel,
} from '../models';
@Entity('product')
export class ProductModel {
  // id - primary id unique
  @PrimaryGeneratedColumn('uuid')
  id: string;

  //ownerId - foreign key relation with PersonModel

  // @Column()
  // @Index()
  // name: string;

  @OneToMany(() => GalleryModel, (gallery) => gallery.companyId)
  galleries: GalleryModel[];

  @OneToMany(() => CryptocurrencyModel, (cryptocurrency) => cryptocurrency.companyId)
  cryptocurrencies: CryptocurrencyModel[];

  @ManyToOne(() => CompanyModel, (company) => company.products)
  @JoinColumn({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => ProjectModel, (project) => project.products)
  @JoinColumn({ name: 'project_id' })
  projectId: string;

  @ManyToMany(() => CategoryModel)
  @JoinTable({
    name: 'product_categories',
    joinColumn: { name: 'product_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories: CategoryModel[];

  @ManyToMany(() => SectorModel)
  @JoinTable({
    name: 'product_sectors',
    joinColumn: { name: 'product_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'sector_id', referencedColumnName: 'id' },
  })
  sectors: SectorModel[];

  @ManyToMany(() => PersonModel)
  @JoinTable({
    name: 'product_persons',
    joinColumn: { name: 'product_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'person_id', referencedColumnName: 'id' },
  })
  persons: PersonModel[];

  @ManyToMany(() => SponsorModel)
  @JoinTable({
    name: 'product_sponsors',
    joinColumn: { name: 'product_id' },
    inverseJoinColumn: { name: 'sponsor_id' },
  })
  sponsors: SponsorModel[]; // entity: Sponsor (array)

  @Column({ name: ' features_and_specs' })
  featuresAndSpecs: string;

  @Column({ name: ' avatar' })
  avatar: string;

  @Column({ name: 'summary' })
  summary: string;

  @Column({ name: 'recent_tweet' })
  recentTweet: string;

  @Column({ name: 'twitter_url' })
  twitterUrl: string;

  @Column({ name: 'telegram_url' })
  telegramUrl: string;

  @Column({ name: 'facebook_url' })
  facebookUrl: string;

  @Column({ name: 'instagram_url' })
  instagramUrl: string;

  @Column({ name: 'linkedin_url' })
  linkedinUrl: string;

  @Column({ name: 'github_url' })
  githubUrl: string;

  @Column({ name: 'medium_url' })
  mediumUrl: string;

  @Column({ name: 'youtube_url' })
  youtubeUrl: string;

  @Column({ name: 'website_url' })
  websiteUrl: string;

  @Column({ name: 'blog_url' })
  blogUrl: string;

  @Column({ name: 'download_url' })
  downloadUrl: string;

  // Record created at
  @Column('timestamp', { name: 'created_at' })
  createdAt?: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt?: Date;
}
