/**
 * app.module.ts — Root assembly. Wires the bounded contexts (support, safety) and shared surface together.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IdentityModule } from './identity/identity.module';
import { persistenceModule } from './infrastructure/database/persistence.module';
import { SafetyModule } from './safety/safety.module';
import { HealthController } from './shared/health.controller';
import { TimeModule } from './shared/time/time.module';
import { SupportModule } from './support/support.module';

@Module({
  imports: [
    // Env files are loaded once by load-env.ts (NODE_ENV-aware); without
    // ignoreEnvFile, ConfigModule would also load `.env` in development and
    // leak its DATABASE_URL into the in-memory dev run.
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    persistenceModule(),
    TimeModule,
    IdentityModule,
    SupportModule,
    SafetyModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
