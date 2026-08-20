import type { HealthConcern, TrackEvent } from './types.ts';

/**
 * Health concerns are tracked per concern type rather than per entry: the most
 * recent entry for a given concern is the current state of it. So logging
 * "injury" and later logging "injury — resolved" clears it, while an unrelated
 * "dehydration" entry in between stays open on its own.
 *
 * Without this, `resolved` would be a flag nothing ever reads.
 */

export interface OpenConcern {
  concern: HealthConcern;
  /** When the still-open entry was logged. */
  since: string;
  notes?: string;
}

export function openHealthConcerns(events: TrackEvent[]): OpenConcern[] {
  const latestByConcern = new Map<HealthConcern, TrackEvent>();

  for (const event of events) {
    if (event.type !== 'health' || !event.concern) continue;
    const current = latestByConcern.get(event.concern);
    if (!current || event.at > current.at) latestByConcern.set(event.concern, event);
  }

  return [...latestByConcern.values()]
    .filter((event) => !event.resolved)
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((event) => ({
      concern: event.concern as HealthConcern,
      since: event.at,
      notes: event.notes,
    }));
}
