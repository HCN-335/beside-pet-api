/**
 * persistence.module.ts — chooses the persistence adapters at startup.
 * If DATABASE_URL is set in the environment → TypeORM + Postgres repositories;
 * otherwise → in-memory (keeps the deterministic stub/regression path DB-free).
 * Either way it binds the same ACCOUNT_REPOSITORY / SESSION_REPOSITORY tokens and
 * is global, so the bounded contexts inject the ports without knowing which is live.
 *
 * Note: DATABASE_URL is read from the process environment (e.g. passed on the
 * command line, the same way PORT/ADMIN_* are), not lazily from a .env file.
 */
import { type DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ACCOUNT_REPOSITORY } from '@/identity/domain/port/tokens';
import { InMemoryAccountRepository } from '@/identity/infrastructure/in-memory-account.repository';
import { PostgresAccountRepository } from '@/identity/infrastructure/typeorm/postgres-account.repository';
import { SESSION_REPOSITORY } from '@/support/domain/port/tokens';
import { InMemorySessionRepository } from '@/support/infrastructure/persistence/in-memory-session.repository';
import { PostgresSessionRepository } from '@/support/infrastructure/persistence/typeorm/postgres-session.repository';
import { dataSourceOptions } from './typeorm-options';

/** Module identity token for the persistence providers (configured by persistenceModule). */
@Module({})
export class PersistenceModule {}

/**
 * Builds the persistence module: TypeORM + Postgres when DATABASE_URL is set,
 * otherwise the in-memory adapters. Either way it binds the same
 * ACCOUNT_REPOSITORY / SESSION_REPOSITORY tokens and is global, so the bounded
 * contexts inject the ports without knowing which adapter is live.
 */
export function persistenceModule(): DynamicModule {
  const useDatabase = (process.env.DATABASE_URL ?? '').length > 0;

  if (useDatabase) {
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

  return {
    module: PersistenceModule,
    global: true,
    providers: [
      { provide: ACCOUNT_REPOSITORY, useClass: InMemoryAccountRepository },
      { provide: SESSION_REPOSITORY, useClass: InMemorySessionRepository },
    ],
    exports: [ACCOUNT_REPOSITORY, SESSION_REPOSITORY],
  };
}
