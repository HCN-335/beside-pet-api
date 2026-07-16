/**
 * start-session.request.ts — request body for POST /v1/sessions.
 * Matches the frontend StartRequest { sessionId, griefProfile } contract. The
 * conversation language lives on griefProfile.preferredLanguage (single source).
 */
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { GriefProfileDto } from './grief-profile.dto';

export class StartSessionRequest {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  /** Present for a first-time (onboarding) session; omitted to continue from history. */
  @IsOptional()
  @ValidateNested()
  @Type(() => GriefProfileDto)
  griefProfile?: GriefProfileDto;
}
