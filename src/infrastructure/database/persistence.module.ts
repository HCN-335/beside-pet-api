/**
 * persistence.module.ts — TypeORM + Postgres persistence (global).
 * DATABASE_URL is required: conversations are the product's record, so the
 * server refuses to boot without a database instead of degrading silently.
 * Binds the ACCOUNT_REPOSITORY / SESSION_REPOSITORY tokens, so the bounded
 * contexts inject their ports without knowing the adapter.
 *
 * Note: DATABASE_URL is read from the process environment (loaded once by
 * load-env.ts), not lazily from a .env file.
 */
import { type DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ACCOUNT_REPOSITORY } from '@/identity/domain/port/tokens';
import { PostgresAccountRepository } from '@/identity/infrastructure/typeorm/postgres-account.repository';
import { SESSION_REPOSITORY } from '@/support/domain/port/tokens';
import { PostgresSessionRepository } from '@/support/infrastructure/persistence/typeorm/postgres-session.repository';
import { dataSourceOptions } from './typeorm-options';

/** Module identity token for the persistence providers (configured by persistenceModule). */
@Module({})
export class PersistenceModule {}

/** Builds the persistence module. Fails fast when DATABASE_URL is missing. */
export function persistenceModule(): DynamicModule {
  if ((process.env.DATABASE_URL ?? '').length === 0) {
    throw new Error('DATABASE_URL is required — the server persists to Postgres only.');
  }

  return {
    module: PersistenceModule,
    global: true,
    imports: [TypeOrmModule.forRoot({ ...dataSourceOptions, migrationsRun: true })],
    providers: [
      { provide: ACCOUNT_REPOSITORY, useClass: PostgresAccountRepository },
      { provide: SESSION_REPOSITORY, useClass: PostgresSessionRepository },
    ],
    exports: [ACCOUNT_REPOSITORY, SESSION_REPOSITORY],
  };
}
