import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import type { Place } from './place.entity';
import type { PricingRule } from './pricing-rule.entity';

@Entity('accommodation_types')
export class AccommodationType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'int', name: 'default_capacity' })
  defaultCapacity: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany('Place', 'accommodationType')
  places: Place[];

  @OneToMany('PricingRule', 'accommodationType')
  pricingRules: PricingRule[];
}
