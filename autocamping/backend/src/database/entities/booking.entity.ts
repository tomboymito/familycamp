import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { Place } from './place.entity';
import type { Customer } from './customer.entity';
import type { Payment } from './payment.entity';
import type { IntegrationLog } from './integration-log.entity';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'place_id' })
  placeId: string;

  @Column({ type: 'uuid', name: 'customer_id' })
  customerId: string;

  @Column({ type: 'date', name: 'check_in' })
  checkIn: string;

  @Column({ type: 'date', name: 'check_out' })
  checkOut: string;

  @Column({ type: 'int', name: 'guests_count' })
  guestsCount: number;

  @Column({ type: 'varchar', nullable: true })
  source: string | null;

  @Column({ type: 'varchar' })
  status: string;

  @Column({ type: 'varchar', name: 'payment_status' })
  paymentStatus: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_price', nullable: true })
  totalPrice: string | null;

  @Column({ type: 'varchar', default: '12:00', name: 'check_in_time' })
  checkInTime: string;

  @Column({ type: 'varchar', default: '14:00', name: 'check_out_time' })
  checkOutTime: string;

  @Column({ type: 'text', nullable: true, name: 'customer_note' })
  customerNote: string | null;

  @Column({ type: 'text', nullable: true, name: 'admin_note' })
  adminNote: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'crm_external_id' })
  crmExternalId: string | null;

  @Column({ type: 'varchar', default: 'pending', name: 'crm_sync_status' })
  crmSyncStatus: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne('Place', 'bookings')
  @JoinColumn({ name: 'place_id' })
  place: Place;

  @ManyToOne('Customer', 'bookings')
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @OneToMany('Payment', 'booking')
  payments: Payment[];

  @OneToMany('IntegrationLog', 'booking')
  integrationLogs: IntegrationLog[];
}
