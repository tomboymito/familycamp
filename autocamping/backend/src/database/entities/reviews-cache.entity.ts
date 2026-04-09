import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('reviews_cache')
export class ReviewsCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  source: string;

  @Column({ type: 'varchar', nullable: true, name: 'author_name' })
  authorName: string | null;

  @Column({ type: 'int', nullable: true })
  rating: number | null;

  @Column({ type: 'text', nullable: true, name: 'review_text' })
  reviewText: string | null;

  @Column({ type: 'date', nullable: true, name: 'review_date' })
  reviewDate: string | null;

  @Column({ type: 'varchar', unique: true, nullable: true, name: 'external_id' })
  externalId: string | null;

  @Column({ type: 'timestamp', name: 'fetched_at' })
  fetchedAt: Date;
}
