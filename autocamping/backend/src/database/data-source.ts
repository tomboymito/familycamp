import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

// Load .env from autocamping/ root (two levels up from backend/src/database/)
config({ path: resolve(process.cwd(), '../.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
  database: process.env.POSTGRES_DB,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  entities: [resolve(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [resolve(__dirname, './migrations/*{.ts,.js}')],
  synchronize: false,
  logging: true,
});
