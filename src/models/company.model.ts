import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import {
  CategoryModel,
  CountryModel,
  CryptocurrencyModel,
  GalleryModel,
  ProductModel,
  ProjectModel,
  SectorModel,
  TeamModel,
  FeatureModel,
  SupportModel,
  CCYModel,
} from '../models';

@Entity('company')
export class CompanyModel {
  // id - primary id unique
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  name: string;

  @OneToMany(() => TeamModel, (team) => team.companyId)
  teams: TeamModel[];

  @OneToMany(() => FeatureModel, (feature) => feature.companyId)
  features: FeatureModel[];

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

  @ManyToMany(() => CCYModel)
  @JoinTable({
    name: 'company_ccys',
    joinColumn: { name: 'company_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'ccy_id', referencedColumnName: 'id' },
  })
  ccys: CCYModel[];

  @ManyToMany(() => SupportModel)
  @JoinTable({
    name: 'company_supports',
    joinColumn: { name: 'company_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'support_id', referencedColumnName: 'id' },
  })
  supports: SupportModel[];

  //Sector - foreign key relation with SectorModel

  @Column({ name: 'director', nullable: true })
  director: string;

  @Column({ name: 'about', nullable: true })
  about: string;

  @Column({ name: 'headquarter', nullable: true })
  headquarter: string;

  @Column({ name: 'avatar', nullable: true })
  avatar: string;

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
