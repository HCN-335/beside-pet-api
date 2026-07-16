/**
 * list-accounts.query.ts — account list for admin (read-only). Excludes passwordHash.
 */
import { Inject, Injectable } from '@nestjs/common';
import type { AccountRepository } from '@/identity/domain/port/account.repository';
import { ACCOUNT_REPOSITORY } from '@/identity/domain/port/tokens';
import { CLOCK, type Clock } from '@/shared/clock/clock';
import { type AccountView, toAccountView } from './dto/account-view';

@Injectable()
export class ListAccountsQuery {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(): Promise<AccountView[]> {
    const accounts = await this.accounts.list();
    const nowMillis = this.clock.nowMillis();
    return accounts.map((account) => toAccountView(account, nowMillis));
  }
}
