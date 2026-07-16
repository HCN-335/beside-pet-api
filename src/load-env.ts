/**
 * load-env.ts — loads the right env file before anything else reads process.env.
 * Development (`pnpm start:dev`, NODE_ENV=development) → .env.development.
 * Everything else (prod-like `pnpm start`, the container image) → .env.
 * Imported for its side effect at the very top of main.ts, ahead of AppModule,
 * so config read at module-construction time (e.g. DATABASE_URL) sees it too.
 * In a real container, .env is absent (dockerignored) — config is injected as
 * environment variables and this call is a harmless no-op.
 */
import { config } from 'dotenv';

const file = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
config({ path: file });
