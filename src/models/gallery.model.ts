import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CompanyModel, ProductModel } from '../models';
@Entity('gallery', { synchronize: true })
export class GalleryModel {
  // id - primary id unique
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column('varchar', { name: 'url' })
  url: string;

  @ManyToOne(() => CompanyModel, (company) => company.galleries)
  @JoinColumn({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => ProductModel, (product) => product.galleries)
  @JoinColumn({ name: 'product_id' })
  productId: string;

  // Record created at
  @Column('timestamp', { name: 'created_at' })
  createdAt: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt: Date;
}
