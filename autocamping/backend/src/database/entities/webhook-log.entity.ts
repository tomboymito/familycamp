import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('webhook_logs')
export class WebhookLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  source: string; // 'booking.com' | 'avito' | 'generic' | ...

  @Column({ type: 'varchar', name: 'event_type', default: 'booking' })
  eventType: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: string; // 'ok' | 'conflict' | 'error' | 'duplicate'

  @Column({ type: 'text', nullable: true, name: 'raw_payload' })
  rawPayload: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'booking_id' })
  bookingId: string | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
