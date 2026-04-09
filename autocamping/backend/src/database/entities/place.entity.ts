import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import type { AccommodationType } from './accommodation-type.entity';
import type { Booking } from './booking.entity';
import type { Hold } from './hold.entity';
import type { Blocking } from './blocking.entity';

@Entity('places')
export class Place {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'type_id' })
  typeId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', unique: true })
  code: string;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'boolean', default: false, name: 'has_electricity' })
  hasElectricity: boolean;

  @Column({ type: 'boolean', default: false, name: 'has_water' })
  hasWater: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder: number;

  @Column({
    type: 'varchar',
    default: 'unknown',
    name: 'housekeeping_status',
  })
  housekeepingStatus: 'clean' | 'ready' | 'dirty' | 'maintenance' | 'unknown';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne('AccommodationType', 'places')
  @JoinColumn({ name: 'type_id' })
  accommodationType: AccommodationType;

  @OneToMany('Booking', 'place')
  bookings: Booking[];

  @OneToMany('Hold', 'place')
  holds: Hold[];

  @OneToMany('Blocking', 'place')
  blockings: Blocking[];
}
