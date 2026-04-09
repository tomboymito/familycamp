import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { Place } from './place.entity';

@Entity('blockings')
export class Blocking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'place_id' })
  placeId: string;

  @Column({ type: 'date', name: 'date_from' })
  dateFrom: string;

  @Column({ type: 'date', name: 'date_to' })
  dateTo: string;

  @Column({ type: 'varchar', nullable: true })
  reason: string | null;

  @Column({ type: 'varchar', default: 'admin', name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne('Place', 'blockings')
  @JoinColumn({ name: 'place_id' })
  place: Place;
}
