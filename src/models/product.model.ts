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
  GalleryModel,
  CryptocurrencyModel,
  CompanyModel,
  CategoryModel,
  ProjectModel,
  TeamModel,
  FeatureModel,
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

  @OneToMany(() => FeatureModel, (feature) => feature.productId)
  features: FeatureModel[];

  @ManyToOne(() => CompanyModel, (company) => company.products)
  @JoinColumn({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => ProjectModel, (project) => project.products)
  @JoinColumn({ name: 'project_id' })
  projectId: string;

  @ManyToMany(() => TeamModel)
  @JoinTable({
    name: 'product_teams',
    joinColumn: { name: 'product_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'team_id', referencedColumnName: 'id' },
  })
  teams: TeamModel[];

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

  @ManyToMany(() => SponsorModel)
  @JoinTable({
    name: 'product_sponsors',
    joinColumn: { name: 'product_id' },
    inverseJoinColumn: { name: 'sponsor_id' },
  })
  sponsors: SponsorModel[]; // entity: Sponsor (array)

  @Column({ name: 'email' })
  email: string;

  @Column({ name: ' avatar' })
  avatar: string;

  @Column({ name: 'about' })
  about: string;

  @Column({ name: 'ios_app' })
  iosApp: string;

  @Column({ name: 'googleplay_app' })
  googleplayApp: string;

  @Column({ name: 'chrome_extension' })
  chromeExtension: string;

  @Column({ name: 'mac_app' })
  macApp: string;

  @Column({ name: 'linux_app' })
  linuxApp: string;

  @Column({ name: 'windows_app' })
  windowsApp: string;

  @Column({ name: 'wiki' })
  wiki: string;

  @Column({ name: 'tel' })
  tel: string;

  @Column({ name: 'recent_tweet' })
  recentTweet: string;

  @Column({ name: 'twitter' })
  twitter: string;

  @Column({ name: 'telegram' })
  telegram: string;

  @Column({ name: 'facebook' })
  facebook: string;

  @Column({ name: 'instagram' })
  instagram: string;

  @Column({ name: 'linkedin' })
  linkedin: string;

  @Column({ name: 'github' })
  github: string;

  @Column({ name: 'medium' })
  medium: string;

  @Column({ name: 'youtube' })
  youtube: string;

  @Column({ name: 'website' })
  website: string;

  @Column({ name: 'blog' })
  blog: string;

  @Column({ name: 'download' })
  download: string;

  @Column({ name: 'reddit', nullable: true })
  reddit: string;

  // Record created at
  @Column('timestamp', { name: 'created_at' })
  createdAt?: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt?: Date;
}
