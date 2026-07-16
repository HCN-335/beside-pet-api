/**
 * reactivate-account.usecase.ts — admin reactivates a revoked/deleted account (→ active).
 * The account can access again immediately on its next request.
 */
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AccountRepository } from '@/identity/domain/port/account.repository';
import { ACCOUNT_REPOSITORY } from '@/identity/domain/port/tokens';
import { CLOCK, type Clock } from '@/shared/clock/clock';
import { type AccountView, toAccountView } from './dto/account-view';

@Injectable()
export class ReactivateAccountUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(accountId: string): Promise<AccountView> {
    const account = await this.accounts.findById(accountId);
    if (!account) {
      throw new NotFoundException(`Account not found: ${accountId}`);
    }
    account.reactivate();
    await this.accounts.save(account);
    return toAccountView(account, this.clock.nowMillis());
  }
}
