import Dexie, { type EntityTable } from 'dexie';
import type { Meta, Spider, TrackEvent } from './types';

/**
 * Every read and write of tracker data goes through this file.
 *
 * Right now the store is IndexedDB, which lives on this device only — nothing
 * is uploaded and there is no server. If sync is ever added, this module is the
 * only one that has to change; nothing in the UI knows where the data lives.
 *
 * Two conventions exist purely so that a future sync is possible without a
 * painful migration:
 *   - every record carries a random UUID, so two databases can be merged
 *     without id collisions
 *   - every record carries createdAt/updatedAt, so a merge can decide which
 *     copy of a record is the newer one
 *
 * The record shapes themselves live in `types.ts` so they can be imported
 * without loading Dexie.
 */

export * from './types';

const db = new Dexie('spoodhub') as Dexie & {
  spiders: EntityTable<Spider, 'id'>;
  events: EntityTable<TrackEvent, 'id'>;
  meta: EntityTable<Meta, 'key'>;
};

db.version(1).stores({
  spiders: 'id, name, archived, createdAt, updatedAt',
  events: 'id, spiderId, type, at, updatedAt, [spiderId+at], [spiderId+type]',
  meta: 'key',
});

export { db };

export const newId = (): string => crypto.randomUUID();

const now = (): string => new Date().toISOString();

// ---------------------------------------------------------------------------
// Spiders
// ---------------------------------------------------------------------------

export type NewSpider = Omit<Spider, 'id' | 'createdAt' | 'updatedAt' | 'archived'> &
  Partial<Pick<Spider, 'archived'>>;

export async function createSpider(input: NewSpider): Promise<string> {
  const stamp = now();
  const spider: Spider = {
    ...input,
    archived: input.archived ?? 0,
    id: newId(),
    createdAt: stamp,
    updatedAt: stamp,
  };
  await db.spiders.add(spider);
  return spider.id;
}

export async function updateSpider(id: string, patch: Partial<Spider>): Promise<void> {
  await db.spiders.update(id, { ...patch, updatedAt: now() });
}

/** Archiving keeps the history intact; deleting removes the events too. */
export async function archiveSpider(id: string): Promise<void> {
  await updateSpider(id, { archived: 1 });
}

export async function unarchiveSpider(id: string): Promise<void> {
  await updateSpider(id, { archived: 0 });
}

export async function deleteSpiderForever(id: string): Promise<void> {
  await db.transaction('rw', db.spiders, db.events, async () => {
    await db.events.where('spiderId').equals(id).delete();
    await db.spiders.delete(id);
  });
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type NewEvent = Omit<TrackEvent, 'id' | 'createdAt' | 'updatedAt'>;

export async function logEvent(input: NewEvent): Promise<string> {
  const stamp = now();
  const event: TrackEvent = {
    ...input,
    id: newId(),
    createdAt: stamp,
    updatedAt: stamp,
  };

  await db.transaction('rw', db.spiders, db.events, async () => {
    await db.events.add(event);

    // A molt is the one event that changes the spider record itself.
    if (event.type === 'molt' && typeof event.newInstar === 'number') {
      await db.spiders.update(event.spiderId, {
        instar: event.newInstar,
        updatedAt: stamp,
      });
    }
  });

  return event.id;
}

export async function updateEvent(id: string, patch: Partial<TrackEvent>): Promise<void> {
  await db.events.update(id, { ...patch, updatedAt: now() });
}

/**
 * Replaces an event wholesale rather than patching it.
 *
 * A patch would leave stale type-specific fields behind — correcting a feeding
 * that was really a molt would keep `prey` and `accepted` on the record, and
 * the pre-molt rules read those. Writing the whole object means the stored
 * event always matches exactly one event type.
 */
export async function replaceEvent(id: string, input: NewEvent): Promise<void> {
  const stamp = now();

  await db.transaction('rw', db.spiders, db.events, async () => {
    const existing = await db.events.get(id);
    if (!existing) throw new Error('That entry no longer exists.');

    await db.events.put({
      ...input,
      id,
      createdAt: existing.createdAt,
      updatedAt: stamp,
    });

    // Same rule as logging: a molt is the one event that changes the spider.
    if (input.type === 'molt' && typeof input.newInstar === 'number') {
      await db.spiders.update(input.spiderId, {
        instar: input.newInstar,
        updatedAt: stamp,
      });
    }
  });
}

export async function deleteEvent(id: string): Promise<void> {
  await db.events.delete(id);
}

/** Newest first — every screen wants it in that order. */
export async function eventsForSpider(spiderId: string): Promise<TrackEvent[]> {
  const rows = await db.events.where('spiderId').equals(spiderId).toArray();
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

export async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const row = await db.meta.get(key);
  return row ? (row.value as T) : fallback;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

/**
 * Asks the browser to mark this origin's storage as persistent, so it is not
 * evicted when the device runs low on space. Safe to call on every load.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}
