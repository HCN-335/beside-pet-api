/**
 * safety.controller.ts — Safety resources surface.
 *  GET /v1/safety/resources  List of support resources / helplines to point to in a crisis
 */
import { Controller, Get } from '@nestjs/common';
import { type SafetyResource, safetyResources } from '../domain/safety-resources';

@Controller('v1/safety')
export class SafetyController {
  @Get('resources')
  resources(): SafetyResource[] {
    return safetyResources();
  }
}
