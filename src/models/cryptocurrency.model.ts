import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ProductModel, CompanyModel } from '../models';
@Entity('cryptocurrency', { synchronize: false })
export class CryptocurrencyModel {
  // id - primary id unique
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;
  // name
  @Column('varchar', { name: 'name' })
  name: string;

  @ManyToOne(() => CompanyModel, (company) => company.cryptocurrencies)
  @JoinColumn({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => ProductModel, (product) => product.cryptocurrencies)
  @JoinColumn({ name: 'product_id' })
  productId: string;

  // Record created at
  @Column('timestamp', { name: 'created_at' })
  createdAt?: Date;
  // Record updated at
  @Column('timestamp', { name: 'updated_at', nullable: true })
  updatedAt?: Date;
}
