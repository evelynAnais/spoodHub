/**
 * Record shapes, kept separate from `db.ts` so that anything reasoning *about*
 * tracker data can be imported without pulling in Dexie — which needs a real
 * IndexedDB and therefore cannot be loaded in a plain Node process. That is
 * what makes the pre-molt rules unit-testable.
 */

export type Sex = 'female' | 'male' | 'unknown';

export type EventType = 'feed' | 'molt' | 'rehouse' | 'behavior' | 'health' | 'note';

/** Behavior tags that feed into the pre-molt heuristic. */
export const PREMOLT_BEHAVIORS = [
  'webbing',
  'sealed-retreat',
  'hiding',
  'dull-colors',
  'fat-abdomen',
  'lethargic',
] as const;

export const OTHER_BEHAVIORS = [
  'hunting',
  'basking',
  'exploring',
  'courting',
  'drinking',
  'threat-display',
] as const;

export const ALL_BEHAVIORS = [...PREMOLT_BEHAVIORS, ...OTHER_BEHAVIORS] as const;
export type Behavior = (typeof ALL_BEHAVIORS)[number];

export const HEALTH_CONCERNS = [
  'stuck-molt',
  'injury',
  'limb-loss',
  'dehydration',
  'not-eating',
  'lethargy',
  'fall',
  'other',
] as const;
export type HealthConcern = (typeof HEALTH_CONCERNS)[number];

export const REHOUSE_REASONS = [
  'outgrew-enclosure',
  'upgrade',
  'cleaning',
  'escape-risk',
  'new-arrival',
  'other',
] as const;
export type RehouseReason = (typeof REHOUSE_REASONS)[number];

export interface Spider {
  id: string;
  name: string;
  /** Slug of an entry in the `species` content collection, when known. */
  speciesSlug?: string;
  /** Free text, for species the site does not have a page for yet. */
  speciesName?: string;
  sex: Sex;
  /** Current instar. Unknown for most rescues/wild catches, so optional. */
  instar?: number;
  acquiredAt?: string;
  source?: string;
  notes?: string;
  /** 0/1 rather than boolean — IndexedDB cannot index booleans. */
  archived: 0 | 1;
  createdAt: string;
  updatedAt: string;
}

export interface TrackEvent {
  id: string;
  spiderId: string;
  type: EventType;
  /** ISO timestamp of when the thing happened (not when it was logged). */
  at: string;
  notes?: string;

  // type: 'feed'
  prey?: string;
  preySize?: 'small' | 'medium' | 'large';
  /**
   * How many prey items this feeding involved. Optional because entries logged
   * before this field existed have no value — treat a missing quantity as 1.
   */
  quantity?: number;
  accepted?: boolean;

  // type: 'molt'
  newInstar?: number;

  // type: 'behavior'
  behaviors?: Behavior[];

  // type: 'health'
  concern?: HealthConcern;
  /** Unresolved concerns stay flagged on the spider until they are cleared. */
  resolved?: boolean;

  // type: 'rehouse'
  enclosure?: string;
  rehouseReason?: RehouseReason;

  createdAt: string;
  updatedAt: string;
}

/** Small key/value table for app state that is not a spider or an event. */
export interface Meta {
  key: string;
  value: unknown;
}
