/**
 * in-memory-session.repository.ts — initial session persistence implementation (in-memory).
 * Saves/restores via snapshots, so the domain stays unchanged even when swapped for a Postgres adapter later.
 */
import { Injectable } from '@nestjs/common';
import { Session, type SessionSnapshot } from '@/support/domain/model/session';
import type { SessionRepository } from '@/support/domain/port/session.repository';

@Injectable()
export class InMemorySessionRepository implements SessionRepository {
  private readonly store = new Map<string, SessionSnapshot>();

  async save(session: Session): Promise<void> {
    this.store.set(session.id, session.snapshot());
  }

  async findById(id: string): Promise<Session | undefined> {
    const snapshot = this.store.get(id);
    return snapshot ? Session.rehydrate(snapshot) : undefined;
  }

  async findByOwner(ownerId: string, limit?: number): Promise<Session[]> {
    // Map preserves insertion (creation) order; reverse it for newest-first.
    const owned = [...this.store.values()].filter((snapshot) => snapshot.ownerId === ownerId);
    owned.reverse();
    const picked = typeof limit === 'number' ? owned.slice(0, limit) : owned;
    return picked.map((snapshot) => Session.rehydrate(snapshot));
  }
}
