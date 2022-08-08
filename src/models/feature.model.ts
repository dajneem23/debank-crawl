import { PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Entity } from 'typeorm';
import { CompanyModel, ProductModel } from '../models';
@Entity('feature', { synchronize: true })
export class FeatureModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => CompanyModel, (company) => company.features)
  @JoinColumn({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => ProductModel, (product) => product.features)
  @JoinColumn({ name: 'product_id' })
  productId: string;

  // Record created at
  @Column('timestamp', { name: 'created_at' })
  createdAt?: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt?: Date;
}
