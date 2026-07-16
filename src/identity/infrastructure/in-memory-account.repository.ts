/**
 * in-memory-account.repository.ts — first account persistence implementation (in-memory). Stores/restores snapshots.
 */
import { Injectable } from '@nestjs/common';
import { Account } from '@/identity/domain/model/account';
import type { AccountSnapshot } from '@/identity/domain/model/account-snapshot';
import type { AccountRepository } from '@/identity/domain/port/account.repository';

@Injectable()
export class InMemoryAccountRepository implements AccountRepository {
  private readonly store = new Map<string, AccountSnapshot>();

  async save(account: Account): Promise<void> {
    this.store.set(account.id, account.snapshot());
  }

  async findById(id: string): Promise<Account | undefined> {
    const snapshot = this.store.get(id);
    return snapshot ? Account.rehydrate(snapshot) : undefined;
  }

  async findByUsername(username: string): Promise<Account | undefined> {
    for (const snapshot of this.store.values()) {
      if (snapshot.username === username) {
        return Account.rehydrate(snapshot);
      }
    }
    return undefined;
  }

  async list(): Promise<Account[]> {
    return [...this.store.values()].map((snapshot) => Account.rehydrate(snapshot));
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
