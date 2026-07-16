/**
 * safety.controller.ts — Safety resources surface.
 *  GET /v1/safety/resources?locale=ko  List of support resources / helplines to point to in a crisis
 */
import { Controller, Get, Query } from '@nestjs/common';
import { type Locale, resolveQueryLocale } from '@/shared/locale';
import { type SafetyResource, safetyResources } from '../domain/safety-resources';

@Controller('v1/safety')
export class SafetyController {
  @Get('resources')
  resources(@Query('locale') locale?: string): SafetyResource[] {
    const resolved: Locale = resolveQueryLocale(locale);
    return safetyResources(resolved);
  }
}
