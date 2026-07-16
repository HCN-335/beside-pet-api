/**
 * clock.module.ts — global module exposing the Clock token so any provider can inject it.
 */
import { Global, Module } from '@nestjs/common';
import { CLOCK } from './clock';
import { LuxonClock } from './luxon-clock';

@Global()
@Module({
  providers: [{ provide: CLOCK, useClass: LuxonClock }],
  exports: [CLOCK],
})
export class ClockModule {}
