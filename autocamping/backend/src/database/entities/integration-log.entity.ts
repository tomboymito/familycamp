import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { Booking } from './booking.entity';

@Entity('integration_logs')
export class IntegrationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'booking_id' })
  bookingId: string;

  @Column({ type: 'varchar' })
  system: string;

  @Column({ type: 'varchar', name: 'event_type' })
  eventType: string;

  @Column({ type: 'varchar' })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  response: Record<string, unknown> | null;

  @Column({ type: 'int', default: 1, name: 'attempt_number' })
  attemptNumber: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne('Booking', 'integrationLogs')
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;
}
