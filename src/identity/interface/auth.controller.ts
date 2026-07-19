/**
 * auth.controller.ts — first-run setup, login/logout, my info.
 *  GET  /v1/auth/setup   is first-run setup still pending?
 *  POST /v1/auth/setup   one-time token → first admin account (+ signed in)
 *  POST  /v1/auth/register          public account application (→ pending, admin approval required)
 *  POST  /v1/auth/login             username + password → JWT (httpOnly cookie)
 *  POST  /v1/auth/logout            expire the cookie
 *  GET   /v1/auth/me                current account incl. settings (guard required)
 *  PATCH /v1/auth/me/chat-language  set the conversation language (guard required)
 */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AccountView } from '../application/dto/account-view';
import { LoginUseCase } from '../application/login.usecase';
import { MyProfileQuery } from '../application/my-profile.query';
import { RegisterAccountUseCase } from '../application/register-account.usecase';
import { SetupAdminUseCase } from '../application/setup-admin.usecase';
import { UpdateChatLanguageUseCase } from '../application/update-chat-language.usecase';
import type { SetupTokenGate } from '../domain/port/setup-token.port';
import { SETUP_TOKEN_GATE } from '../domain/port/tokens';
import type { AuthenticatedAccount } from '../guard/authenticated-account';
import { AUTH_COOKIE } from '../guard/cookie';
import { CurrentAccount } from '../guard/current-account.decorator';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';
import { LoginRequest } from './dto/login.request';
import { RegisterRequest } from './dto/register.request';
import { SetupRequest } from './dto/setup.request';
import type { SetupStatusResponse } from './dto/setup-status.response';
import { UpdateChatLanguageRequest } from './dto/update-chat-language.request';

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7d

const setAuthCookie = (res: Response, token: string): void => {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
};

@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly login: LoginUseCase,
    private readonly setupAdmin: SetupAdminUseCase,
    private readonly registerAccount: RegisterAccountUseCase,
    private readonly myProfile: MyProfileQuery,
    private readonly updateChatLanguage: UpdateChatLanguageUseCase,
    @Inject(SETUP_TOKEN_GATE) private readonly setupGate: SetupTokenGate,
  ) {}

  @Post('register')
  @HttpCode(201)
  register(@Body() body: RegisterRequest): Promise<AccountView> {
    return this.registerAccount.execute({
      username: body.username,
      password: body.password,
      company: body.company,
    });
  }

  @Get('setup')
  setupStatus(): SetupStatusResponse {
    return { required: this.setupGate.isPending() };
  }

  @Post('setup')
  @HttpCode(200)
  async setup(
    @Body() body: SetupRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccountView> {
    await this.setupAdmin.execute({
      token: body.token,
      username: body.username,
      password: body.password,
      company: body.company,
    });
    // Sign the operator in right away so they land in the dashboard.
    const result = await this.login.execute({ username: body.username, password: body.password });
    setAuthCookie(res, result.token);
    return result.account;
  }

  @Post('login')
  @HttpCode(200)
  async signIn(
    @Body() body: LoginRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccountView> {
    const result = await this.login.execute({ username: body.username, password: body.password });
    setAuthCookie(res, result.token);
    return result.account;
  }

  @Post('logout')
  @HttpCode(204)
  signOut(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(AUTH_COOKIE, { path: '/' });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentAccount() account?: AuthenticatedAccount): Promise<AccountView> | undefined {
    return account ? this.myProfile.execute(account.id) : undefined;
  }

  @Patch('me/chat-language')
  @UseGuards(JwtAuthGuard)
  setChatLanguage(
    @Body() body: UpdateChatLanguageRequest,
    @CurrentAccount() account?: AuthenticatedAccount,
  ): Promise<AccountView> | undefined {
    return account
      ? this.updateChatLanguage.execute({ accountId: account.id, chatLanguage: body.chatLanguage })
      : undefined;
  }
}
