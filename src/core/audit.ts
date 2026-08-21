import { sha256 } from './crypto';
import type { AuditEvent } from './types';

const GENESIS_HASH = '0'.repeat(64);

export class AuditChain {
  private readonly byAction = new Map<string, AuditEvent[]>();

  async append(input: Omit<AuditEvent, 'id' | 'sequence' | 'previousHash' | 'eventHash'>): Promise<AuditEvent> {
    const existing = this.byAction.get(input.actionId) ?? [];
    const eventBase = {
      ...input,
      id: globalThis.crypto.randomUUID(),
      sequence: existing.length + 1,
      previousHash: existing.at(-1)?.eventHash ?? GENESIS_HASH,
    };
    const event: AuditEvent = { ...eventBase, eventHash: await sha256(eventBase) };
    this.byAction.set(input.actionId, [...existing, event]);
    return structuredClone(event);
  }

  list(actionId: string): AuditEvent[] {
    return structuredClone(this.byAction.get(actionId) ?? []);
  }

  async verify(actionId: string): Promise<boolean> {
    const events = this.byAction.get(actionId) ?? [];
    let previousHash = GENESIS_HASH;
    for (let index = 0; index < events.length; index += 1) {
      const event = events[index];
      if (event.sequence !== index + 1 || event.previousHash !== previousHash) return false;
      const { eventHash, ...eventBase } = event;
      if ((await sha256(eventBase)) !== eventHash) return false;
      previousHash = eventHash;
    }
    return true;
  }
}

