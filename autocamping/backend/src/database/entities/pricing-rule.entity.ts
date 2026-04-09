import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { AccommodationType } from './accommodation-type.entity';

@Entity('pricing_rules')
export class PricingRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'type_id' })
  typeId: string;

  @Column({ type: 'date', name: 'valid_from' })
  validFrom: string;

  @Column({ type: 'date', name: 'valid_to' })
  validTo: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'price_per_night' })
  pricePerNight: string;

  @Column({ type: 'int', default: 1, name: 'min_guests' })
  minGuests: number;

  @Column({ type: 'int', nullable: true, name: 'max_guests' })
  maxGuests: number | null;

  @Column({ type: 'varchar', nullable: true, name: 'season_label' })
  seasonLabel: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @ManyToOne('AccommodationType', 'pricingRules')
  @JoinColumn({ name: 'type_id' })
  accommodationType: AccommodationType;
}
