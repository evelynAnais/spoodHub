import { db, getMeta, setMeta, type Spider, type TrackEvent } from './db';

/**
 * Export / import for a local-only database.
 *
 * Because nothing is synced to a server, this file is the only thing standing
 * between a keeper and total data loss if they wipe their browser storage or
 * lose the device. Treat it as a load-bearing feature, not a nice-to-have.
 */

export const BACKUP_FORMAT = 'spoodhub-backup';
export const BACKUP_VERSION = 1;

const LAST_EXPORT_KEY = 'lastExportAt';
export const NAG_AFTER_DAYS = 30;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  spiders: Spider[];
  events: TrackEvent[];
}

export async function buildBackup(): Promise<BackupFile> {
  const [spiders, events] = await Promise.all([db.spiders.toArray(), db.events.toArray()]);
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    spiders,
    events,
  };
}

/** Triggers a file download and records that a backup was taken. */
export async function downloadBackup(): Promise<void> {
  const backup = await buildBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `spoodhub-${backup.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  await setMeta(LAST_EXPORT_KEY, backup.exportedAt);
}

export interface ImportResult {
  spidersAdded: number;
  spidersUpdated: number;
  eventsAdded: number;
  eventsUpdated: number;
}

function assertBackup(value: unknown): asserts value is BackupFile {
  if (typeof value !== 'object' || value === null) {
    throw new Error('That file is not valid JSON object data.');
  }
  const candidate = value as Partial<BackupFile>;
  if (candidate.format !== BACKUP_FORMAT) {
    throw new Error('That does not look like a spoodHub backup file.');
  }
  if (typeof candidate.version !== 'number' || candidate.version > BACKUP_VERSION) {
    throw new Error(
      `That backup was made by a newer version of spoodHub (v${candidate.version}). Update the app first.`,
    );
  }
  if (!Array.isArray(candidate.spiders) || !Array.isArray(candidate.events)) {
    throw new Error('That backup file is missing its spiders or events.');
  }
}

/**
 * `replace` wipes the local database first. `merge` keeps everything and, when
 * the same id exists on both sides, keeps whichever copy has the later
 * updatedAt — the same rule a future server sync would use.
 */
export async function importBackup(
  json: string,
  mode: 'merge' | 'replace' = 'merge',
): Promise<ImportResult> {
  const parsed: unknown = JSON.parse(json);
  assertBackup(parsed);

  const result: ImportResult = {
    spidersAdded: 0,
    spidersUpdated: 0,
    eventsAdded: 0,
    eventsUpdated: 0,
  };

  await db.transaction('rw', db.spiders, db.events, async () => {
    if (mode === 'replace') {
      await db.spiders.clear();
      await db.events.clear();
    }

    for (const incoming of parsed.spiders) {
      const existing = await db.spiders.get(incoming.id);
      if (!existing) {
        await db.spiders.add(incoming);
        result.spidersAdded += 1;
      } else if (incoming.updatedAt > existing.updatedAt) {
        await db.spiders.put(incoming);
        result.spidersUpdated += 1;
      }
    }

    for (const incoming of parsed.events) {
      const existing = await db.events.get(incoming.id);
      if (!existing) {
        await db.events.add(incoming);
        result.eventsAdded += 1;
      } else if (incoming.updatedAt > existing.updatedAt) {
        await db.events.put(incoming);
        result.eventsUpdated += 1;
      }
    }
  });

  return result;
}

export async function getLastExportAt(): Promise<string | null> {
  return getMeta<string | null>(LAST_EXPORT_KEY, null);
}

/**
 * True when there is data worth losing and it has not been exported recently.
 * Drives the reminder banner — people do not remember to press export.
 */
export async function shouldNagForBackup(): Promise<boolean> {
  const spiderCount = await db.spiders.count();
  if (spiderCount === 0) return false;

  const last = await getLastExportAt();
  if (!last) {
    // Give a brand new keeper a little runway before nagging.
    const eventCount = await db.events.count();
    return eventCount >= 5;
  }

  const ageDays = (Date.now() - new Date(last).getTime()) / 86_400_000;
  return ageDays >= NAG_AFTER_DAYS;
}
