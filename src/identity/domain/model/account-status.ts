/**
 * account-status.ts — account status. The guard re-checks this on every request so revoked/deleted
 * accounts are blocked immediately.
 */
export type AccountStatus = 'active' | 'revoked' | 'deleted';

export const isActive = (status: AccountStatus): boolean => status === 'active';
