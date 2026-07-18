/**
 * support.controller.ts — thin HTTP surface for support. Login required; identity is derived from the token.
 *  POST   /v1/sessions               start a session → first reply (owner = logged-in account)
 *  POST   /v1/sessions/:id/messages  one user turn → TurnResult
 *  GET    /v1/sessions/:id           current state (resume)
 *  GET    /v1/sessions/:id/messages  conversation history
 */
import { Body, Controller, Get, HttpCode, Param, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedAccount } from '@/identity/guard/authenticated-account';
import { CurrentAccount } from '@/identity/guard/current-account.decorator';
import { JwtAuthGuard } from '@/identity/guard/jwt-auth.guard';
import type { SessionAnalysisView } from '../application/dto/session-analysis-view';
import type { SessionListItem } from '../application/dto/session-list-item';
import type { SessionStateView } from '../application/dto/session-state-view';
import type { TurnResult } from '../application/dto/turn-result';
import type { Requester } from '../application/ownership';
import { SendMessageUseCase } from '../application/send-message.usecase';
import { StartSessionUseCase } from '../application/start-session.usecase';
import { SupportQuery } from '../application/support.query';
import type { Message } from '../domain/model/message';
import type { MindReport } from '../domain/model/mind-report';
import { SendMessageRequest } from './dto/send-message.request';
import { StartSessionRequest } from './dto/start-session.request';
import { pipeSse } from './sse-writer';

const requesterOf = (account: AuthenticatedAccount): Requester => ({
  id: account.id,
  isAdmin: account.role === 'admin',
});

@Controller('v1/sessions')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(
    private readonly startSession: StartSessionUseCase,
    private readonly sendMessage: SendMessageUseCase,
    private readonly query: SupportQuery,
  ) {}

  @Post()
  @HttpCode(201)
  start(
    @Body() body: StartSessionRequest,
    @CurrentAccount() account: AuthenticatedAccount,
  ): Promise<TurnResult> {
    return this.startSession.execute({
      sessionId: body.sessionId,
      ownerId: account.id,
      griefProfile: body.griefProfile,
    });
  }

  @Post('stream')
  startStream(
    @Body() body: StartSessionRequest,
    @CurrentAccount() account: AuthenticatedAccount,
    @Res() res: Response,
  ): Promise<void> {
    const events = this.startSession.stream({
      sessionId: body.sessionId,
      ownerId: account.id,
      griefProfile: body.griefProfile,
    });
    return pipeSse(res, events);
  }

  @Post(':id/messages')
  @HttpCode(200)
  message(
    @Param('id') id: string,
    @Body() body: SendMessageRequest,
    @CurrentAccount() account: AuthenticatedAccount,
  ): Promise<TurnResult> {
    return this.sendMessage.execute({
      sessionId: id,
      text: body.text,
      requester: requesterOf(account),
    });
  }

  @Post(':id/messages/stream')
  messageStream(
    @Param('id') id: string,
    @Body() body: SendMessageRequest,
    @CurrentAccount() account: AuthenticatedAccount,
    @Res() res: Response,
  ): Promise<void> {
    const events = this.sendMessage.stream({
      sessionId: id,
      text: body.text,
      requester: requesterOf(account),
    });
    return pipeSse(res, events);
  }

  @Get()
  list(@CurrentAccount() account: AuthenticatedAccount): Promise<SessionListItem[]> {
    return this.query.listForOwner(requesterOf(account));
  }

  @Get(':id')
  state(
    @Param('id') id: string,
    @CurrentAccount() account: AuthenticatedAccount,
  ): Promise<SessionStateView> {
    return this.query.state(id, requesterOf(account));
  }

  @Get(':id/messages')
  history(
    @Param('id') id: string,
    @CurrentAccount() account: AuthenticatedAccount,
  ): Promise<Message[]> {
    return this.query.history(id, requesterOf(account));
  }

  @Get(':id/analysis')
  analysis(
    @Param('id') id: string,
    @CurrentAccount() account: AuthenticatedAccount,
  ): Promise<SessionAnalysisView> {
    return this.query.analysis(id, requesterOf(account));
  }

  @Get(':id/report')
  report(
    @Param('id') id: string,
    @CurrentAccount() account: AuthenticatedAccount,
  ): Promise<MindReport> {
    return this.query.report(id, requesterOf(account));
  }
}
