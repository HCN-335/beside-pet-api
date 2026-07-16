/**
 * data-source.ts — TypeORM CLI DataSource (migration generate/run/revert).
 * The running app configures TypeORM via typeorm-options + TypeOrmModule; this
 * file is the equivalent entry point the CLI needs. Set DATABASE_URL in the env.
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from './typeorm-options';

export default new DataSource(dataSourceOptions);
