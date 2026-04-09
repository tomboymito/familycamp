import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { Place } from './place.entity';

@Entity('holds')
export class Hold {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'place_id' })
  placeId: string;

  @Column({ type: 'date', name: 'check_in' })
  checkIn: string;

  @Column({ type: 'date', name: 'check_out' })
  checkOut: string;

  @Column({ type: 'int', name: 'guests_count' })
  guestsCount: number;

  @Column({ type: 'varchar', unique: true, name: 'session_token' })
  sessionToken: string;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne('Place', 'holds')
  @JoinColumn({ name: 'place_id' })
  place: Place;
}
