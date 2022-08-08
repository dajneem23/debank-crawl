import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import {
  CategoryModel,
  CountryModel,
  CryptocurrencyModel,
  GalleryModel,
  PersonModel,
  ProductModel,
  ProjectModel,
  SectorModel,
} from '../models';

@Entity('company')
export class CompanyModel {
  // id - primary id unique
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // @Column()
  // @Index()
  // name: string;

  @OneToMany(() => PersonModel, (person) => person.companyId)
  persons: PersonModel[];

  @OneToMany(() => ProjectModel, (project) => project.companyId)
  projects: ProjectModel[];

  @OneToMany(() => ProductModel, (product) => product.companyId)
  products: ProductModel[];

  @OneToMany(() => CryptocurrencyModel, (cryptocurrency) => cryptocurrency.companyId)
  cryptocurrencies: CryptocurrencyModel[];

  @OneToMany(() => GalleryModel, (gallery) => gallery.companyId)
  galleries: GalleryModel[];

  @ManyToOne(() => CountryModel, (country) => country.events)
  @JoinColumn({ name: 'country_id' })
  country: CountryModel;

  @ManyToMany(() => SectorModel)
  @JoinTable({
    name: 'company_sectors',
    joinColumn: { name: 'company_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'sector_id', referencedColumnName: 'id' },
  })
  sectors: SectorModel[];

  @ManyToMany(() => CategoryModel)
  @JoinTable({
    name: 'company_categories',
    joinColumn: { name: 'company_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories: CategoryModel[];

  //Sector - foreign key relation with SectorModel

  @Column({ name: 'summary', nullable: true })
  summary: string;

  @Column({ name: 'headquarter', nullable: true })
  headquarter: string;

  @Column({ name: 'avatar', nullable: true })
  avatar: string;

  @Column({ name: 'services_and_features', nullable: true })
  servicesAndFeatures: string;

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
