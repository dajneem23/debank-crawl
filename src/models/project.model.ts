import { BlockList } from 'net';
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
import {
  CategoryModel,
  CompanyModel,
  BlockchainModel,
  ProductModel,
  SectorModel,
  TeamModel,
  ExchangeModel,
  WalletModel,
} from '../models';
@Entity('project', { synchronize: true })
export class ProjectModel {
  // id - primary id unique
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;
  // name
  @Column('varchar', { name: 'name' })
  name: string;

  @ManyToOne(() => CompanyModel, (company) => company.projects)
  @JoinColumn({ name: 'company_id' })
  companyId: string;

  @OneToMany(() => ProductModel, (product) => product.projectId)
  products: ProductModel[];

  @ManyToMany(() => TeamModel)
  @JoinTable({
    name: 'project_teams',
    joinColumn: { name: 'project_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'team_id', referencedColumnName: 'id' },
  })
  teams: TeamModel[];

  @ManyToMany(() => BlockchainModel)
  @JoinTable({
    name: 'project_blockchains',
    joinColumn: { name: 'project_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'blockchain_id', referencedColumnName: 'id' },
  })
  blockchains: BlockchainModel[];

  @ManyToMany(() => ExchangeModel)
  @JoinTable({
    name: 'project_exchanges',
    joinColumn: { name: 'project_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'exchange_id', referencedColumnName: 'id' },
  })
  exchanges: ExchangeModel[];

  @ManyToMany(() => WalletModel)
  @JoinTable({
    name: 'project_wallets',
    joinColumn: { name: 'project_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'wallet_id', referencedColumnName: 'id' },
  })
  wallets: WalletModel[];

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

  @Column({ name: 'about', nullable: true })
  about: string;

  @Column({ name: 'review', nullable: true })
  review: string;

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
