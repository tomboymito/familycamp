import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('notification_logs')
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true, name: 'booking_id' })
  bookingId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'customer_id' })
  customerId: string | null;

  @Column({ type: 'varchar' })
  channel: string; // 'email' | 'sms'

  @Column({ type: 'varchar' })
  template: string; // 'confirm' | 'reminder' | 'cancel' | 'custom'

  @Column({ type: 'varchar' })
  recipient: string; // email or phone

  @Column({ type: 'varchar', default: 'pending' })
  status: string; // 'sent' | 'failed' | 'pending' | 'no_provider'

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, string> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
