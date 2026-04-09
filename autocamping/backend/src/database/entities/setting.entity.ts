import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('settings')
export class Setting {
  @PrimaryColumn({ type: 'varchar' })
  key: string;

  @Column({ type: 'text', nullable: true })
  value: string | null;
}
