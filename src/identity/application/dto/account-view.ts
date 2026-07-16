/**
 * account-view.ts — outward-facing account representation. Never includes passwordHash.
 * `expired` is computed against the current instant so the admin UI can render expiry state directly.
 */
import type { Account } from '@/identity/domain/model/account';
import type { AccountStatus } from '@/identity/domain/model/account-status';
import type { Role } from '@/identity/domain/model/role';

export interface AccountView {
  id: string;
  username: string;
  company: string;
  role: Role;
  status: AccountStatus;
  expiresAt?: string;
  expired: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export const toAccountView = (account: Account, nowMillis: number): AccountView => ({
  id: account.id,
  username: account.username,
  company: account.company,
  role: account.role,
  status: account.status,
  expiresAt: account.expiresAt,
  expired: account.isExpired(nowMillis),
  createdAt: account.createdAt,
  lastLoginAt: account.lastLoginAt,
});
