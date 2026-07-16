/**
 * typeorm-options.ts — shared Postgres DataSource options.
 * Used by both the runtime module (TypeOrmModule.forRoot) and the CLI DataSource
 * (data-source.ts). DATABASE_URL is read from the process environment; SSL is
 * opt-in via DATABASE_SSL=true (e.g. for Supabase). synchronize is always off —
 * schema changes go through migrations.
 */
import type { DataSourceOptions } from 'typeorm';
import { AccountEntity } from '@/identity/infrastructure/typeorm/account.entity';
import { SessionEntity } from '@/support/infrastructure/persistence/typeorm/session.entity';
import { TurnAnalysisEntity } from '@/support/infrastructure/persistence/typeorm/turn-analysis.entity';
import { InitialSchema1730000000000 } from './migrations/1730000000000-initial-schema';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [AccountEntity, SessionEntity, TurnAnalysisEntity],
  migrations: [InitialSchema1730000000000],
  synchronize: false,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
};
