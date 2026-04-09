import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { Booking } from './booking.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'booking_id' })
  bookingId: string;

  @Column({ type: 'varchar' })
  provider: string;

  @Column({ type: 'varchar', nullable: true, name: 'provider_payment_id' })
  providerPaymentId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', default: 'RUB' })
  currency: string;

  @Column({ type: 'varchar' })
  status: string;

  @Column({ type: 'jsonb', nullable: true, name: 'provider_response' })
  providerResponse: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne('Booking', 'payments')
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;
}
