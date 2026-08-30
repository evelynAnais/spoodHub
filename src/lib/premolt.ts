// Explicit .ts extension so `node --test` can load this module directly;
// Node's ESM resolver does not guess extensions the way the bundler does.
import { PREMOLT_BEHAVIORS, type Spider, type TrackEvent } from './types.ts';

/**
 * Turns a spider's event history into a "should I be offering food right now?"
 * answer.
 *
 * This is a handful of rules, not a model. The signals it leans on are the ones
 * keepers actually watch for: a run of refused prey, a sealed-up silk retreat,
 * and how far through the expected molt interval the spider is. Every verdict
 * carries the reasons that produced it, because a keeper should be able to
 * disagree with it — it is a prompt to go look at the enclosure, not an oracle.
 */

export type MoltStatus =
  | 'post-molt'
  | 'in-premolt'
  | 'likely-premolt'
  | 'post-rehouse'
  | 'watch'
  | 'normal'
  | 'unknown';

export interface MoltAssessment {
  status: MoltStatus;
  headline: string;
  advice: string;
  reasons: string[];
  /** null when there is not enough history to guess. */
  daysSinceLastMolt: number | null;
  daysSinceLastFeed: number | null;
  refusalStreak: number;
  expectedIntervalDays: number | null;
  /** ISO date, null when unknown. */
  estimatedNextMolt: string | null;
  /** 0–1, how far through the expected interval this spider is. */
  progress: number | null;
  /** Days this spider should go between meals, from its stage. */
  feedIntervalDays: number;
  /**
   * True when prey should be offered now. Already accounts for the states in
   * which feeding is wrong, so a caller cannot accidentally recommend feeding a
   * spider that is sealed in for a molt.
   */
  feedingDue: boolean;
}

/**
 * Rough molt intervals by instar at typical room temperature. Real intervals
 * swing widely with temperature and how well the spider is eating, so these are
 * only used until a spider has molted twice under your care — after that its
 * own history is a far better predictor and takes over.
 */
const DEFAULT_INTERVAL_BY_INSTAR: Record<number, number> = {
  1: 10,
  2: 12,
  3: 14,
  4: 18,
  5: 22,
  6: 28,
  7: 35,
  8: 45,
  9: 55,
};

const FALLBACK_INTERVAL_DAYS = 40;

/**
 * How long between meals, by stage — the same figures the feeding guide gives,
 * rather than a single flat number.
 *
 * Instar stands in for stage because it is what the tracker actually records.
 * An unknown instar gets the adult interval: the longest of the three, so an
 * unrecorded spiderling is under-nagged rather than a settled adult over-nagged.
 */
const FEED_INTERVAL_DAYS = { spiderling: 2, juvenile: 3, adult: 4 } as const;

function feedIntervalFor(instar?: number): number {
  if (instar === undefined) return FEED_INTERVAL_DAYS.adult;
  if (instar <= 3) return FEED_INTERVAL_DAYS.spiderling;
  if (instar <= 6) return FEED_INTERVAL_DAYS.juvenile;
  return FEED_INTERVAL_DAYS.adult;
}
const DAY_MS = 86_400_000;

/**
 * How long after a rehouse a run of refused prey is still more plausibly
 * explained by the disturbance than by an approaching molt. Being moved is a
 * well-known stressor and commonly costs a few feedings.
 */
const REHOUSE_STRESS_DAYS = 10;

const daysBetween = (a: Date, b: Date): number => Math.floor((b.getTime() - a.getTime()) / DAY_MS);

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Whether prey should be offered, decided after the molt status is known.
 *
 * Kept out of the branches above so there is exactly one place that answers it:
 * duplicating the rule is how the summary tile and a spider's own page end up
 * disagreeing about the same animal.
 */
function isFeedingDue(result: MoltAssessment): boolean {
  if (
    result.status === 'in-premolt' ||
    result.status === 'likely-premolt' ||
    result.status === 'post-molt'
  ) {
    return false;
  }
  return (
    result.daysSinceLastFeed === null || result.daysSinceLastFeed >= result.feedIntervalDays
  );
}

export function assessMolt(
  spider: Spider,
  events: TrackEvent[],
  today: Date = new Date(),
): MoltAssessment {
  const result = assessMoltStatus(spider, events, today);
  return { ...result, feedingDue: isFeedingDue(result) };
}

function assessMoltStatus(
  spider: Spider,
  events: TrackEvent[],
  today: Date = new Date(),
): MoltAssessment {
  const byDateAsc = [...events].sort((a, b) => a.at.localeCompare(b.at));

  const molts = byDateAsc.filter((e) => e.type === 'molt');
  const feeds = byDateAsc.filter((e) => e.type === 'feed');
  const behaviors = byDateAsc.filter((e) => e.type === 'behavior');
  const rehouses = byDateAsc.filter((e) => e.type === 'rehouse');

  const lastMolt = molts.at(-1) ?? null;
  const lastFeed = feeds.at(-1) ?? null;
  const lastRehouse = rehouses.at(-1) ?? null;

  const daysSinceLastMolt = lastMolt ? daysBetween(new Date(lastMolt.at), today) : null;
  const daysSinceLastFeed = lastFeed ? daysBetween(new Date(lastFeed.at), today) : null;

  // Consecutive refusals, counting back from the most recent feeding attempt.
  let refusalStreak = 0;
  for (let i = feeds.length - 1; i >= 0; i -= 1) {
    if (feeds[i].accepted === false) refusalStreak += 1;
    else break;
  }

  // This spider's own molt intervals, once there are enough to be meaningful.
  const intervals: number[] = [];
  for (let i = 1; i < molts.length; i += 1) {
    intervals.push(daysBetween(new Date(molts[i - 1].at), new Date(molts[i].at)));
  }

  const expectedIntervalDays =
    intervals.length >= 2
      ? Math.round(median(intervals))
      : spider.instar
        ? (DEFAULT_INTERVAL_BY_INSTAR[spider.instar] ?? FALLBACK_INTERVAL_DAYS)
        : molts.length > 0
          ? FALLBACK_INTERVAL_DAYS
          : null;

  const progress =
    daysSinceLastMolt !== null && expectedIntervalDays
      ? daysSinceLastMolt / expectedIntervalDays
      : null;

  const estimatedNextMolt =
    lastMolt && expectedIntervalDays
      ? new Date(new Date(lastMolt.at).getTime() + expectedIntervalDays * DAY_MS)
          .toISOString()
          .slice(0, 10)
      : null;

  // Pre-molt behavior tags seen in the last two weeks.
  const recentPremoltTags = new Set<string>();
  for (const event of behaviors) {
    if (daysBetween(new Date(event.at), today) > 14) continue;
    for (const tag of event.behaviors ?? []) {
      if ((PREMOLT_BEHAVIORS as readonly string[]).includes(tag)) recentPremoltTags.add(tag);
    }
  }

  const sealedUp = recentPremoltTags.has('sealed-retreat');
  const webbing = recentPremoltTags.has('webbing');
  const reasons: string[] = [];

  // Was the spider moved recently, and did the refusals only start afterwards?
  // If so the disturbance is the simpler explanation, and calling pre-molt here
  // would tell a keeper to stop feeding a spider that is merely unsettled.
  const daysSinceRehouse = lastRehouse
    ? daysBetween(new Date(lastRehouse.at), today)
    : null;
  const refusalStreakStartedAt =
    refusalStreak > 0 ? feeds[feeds.length - refusalStreak].at : null;

  const rehouseExplainsRefusals =
    lastRehouse !== null &&
    daysSinceRehouse !== null &&
    daysSinceRehouse <= REHOUSE_STRESS_DAYS &&
    refusalStreakStartedAt !== null &&
    lastRehouse.at <= refusalStreakStartedAt;

  const feedIntervalDays = feedIntervalFor(spider.instar);

  const base = {
    feedIntervalDays,
    feedingDue: false, // filled in by assessMolt once the status is known
    daysSinceLastMolt,
    daysSinceLastFeed,
    refusalStreak,
    expectedIntervalDays,
    estimatedNextMolt,
    progress,
  };

  // --- Just molted: fangs are still soft, feeding now can injure the spider.
  if (daysSinceLastMolt !== null && daysSinceLastMolt <= 3) {
    return {
      ...base,
      status: 'post-molt',
      headline: `Molted ${daysSinceLastMolt === 0 ? 'today' : `${daysSinceLastMolt}d ago`}`,
      advice:
        'Do not feed yet. Fangs harden over roughly 3–5 days after a molt — offering prey too early risks damage. Water and quiet only.',
      reasons: ['Molt logged within the last 3 days'],
    };
  }

  // --- Sealed into a retreat: the strongest signal there is.
  if (sealedUp) {
    reasons.push('Sealed retreat reported in the last 14 days');
    if (refusalStreak > 0) reasons.push(`${refusalStreak} refused feeding${refusalStreak > 1 ? 's' : ''} in a row`);
    return {
      ...base,
      status: 'in-premolt',
      headline: 'In pre-molt — leave alone',
      advice:
        'Stop offering prey and remove any live feeders from the enclosure. Do not open, mist directly, or disturb the retreat — an interrupted molt is frequently fatal.',
      reasons,
    };
  }

  // --- Refusals that only began after a rehouse.
  //
  // Deliberately placed below the sealed-retreat check: a sealed retreat is
  // physical evidence of a molt and outranks any amount of stress. But refusals
  // alone, starting right after the spider was moved, are far more likely to be
  // the move than a molt — and the wrong call here tells a keeper to stop
  // feeding a healthy, merely unsettled spider.
  //
  // Pre-molt behavior tags or a longer streak tip it back the other way, so
  // both send this on to the pre-molt branches below.
  if (rehouseExplainsRefusals && recentPremoltTags.size === 0 && refusalStreak <= 3) {
    reasons.push(
      `${refusalStreak} refused feeding${refusalStreak > 1 ? 's' : ''}, all since being rehoused`,
    );
    reasons.push(`Rehoused ${daysSinceRehouse === 0 ? 'today' : `${daysSinceRehouse}d ago`}`);
    if (progress !== null && progress >= 0.85) {
      reasons.push(
        `Also ${daysSinceLastMolt}d since last molt (expected around ${expectedIntervalDays}d), so a molt is not ruled out`,
      );
    }
    return {
      ...base,
      status: 'post-rehouse',
      headline: 'Refusing food since the rehouse',
      advice:
        'Being moved commonly costs a few feedings. Keep offering at the normal interval and remove anything uneaten. If webbing thickens or the retreat seals up, treat it as pre-molt instead.',
      reasons,
    };
  }

  // --- Three refusals in a row is the classic pre-molt tell.
  if (refusalStreak >= 3 || (refusalStreak >= 2 && (webbing || recentPremoltTags.size > 0))) {
    reasons.push(`${refusalStreak} refused feedings in a row`);
    if (webbing) reasons.push('Heavy webbing reported recently');
    for (const tag of recentPremoltTags) {
      if (tag !== 'webbing') reasons.push(`Reported: ${tag.replace(/-/g, ' ')}`);
    }
    if (progress !== null && progress > 0.7) {
      reasons.push(`${daysSinceLastMolt}d since last molt (expected around ${expectedIntervalDays}d)`);
    }
    return {
      ...base,
      status: 'in-premolt',
      headline: 'Likely in pre-molt',
      advice:
        'Stop offering prey and remove any uneaten live feeders. Keep humidity steady and leave the enclosure undisturbed until you see a shed exuvia.',
      reasons,
    };
  }

  // --- Early warning.
  //
  // Being overdue on the calendar is deliberately not sufficient on its own.
  // A spider that is still taking prey readily is not in pre-molt however far
  // past the expected interval it is — those intervals are rough and swing
  // widely with temperature, so without a behavioral signal to corroborate
  // them this would just nag about healthy, hungry spiders.
  const hasBehavioralSignal = refusalStreak >= 1 || recentPremoltTags.size > 0;

  if (refusalStreak >= 2 || (progress !== null && progress >= 0.85 && hasBehavioralSignal)) {
    if (refusalStreak >= 1) {
      reasons.push(
        `${refusalStreak} refused feeding${refusalStreak > 1 ? 's' : ''} in a row`,
      );
    }
    if (progress !== null && progress >= 0.85) {
      reasons.push(`${daysSinceLastMolt}d since last molt (expected around ${expectedIntervalDays}d)`);
    }
    if (recentPremoltTags.size > 0) {
      reasons.push(`Reported: ${[...recentPremoltTags].join(', ').replace(/-/g, ' ')}`);
    }
    return {
      ...base,
      status: 'likely-premolt',
      headline: 'Pre-molt likely soon',
      advice:
        'Offer smaller prey, or skip a feeding. Make sure there is a clean water source and do not rearrange the enclosure for now.',
      reasons,
    };
  }

  // --- Worth keeping an eye on: overdue on the calendar, or soft signs alone.
  if ((progress !== null && progress >= 0.7) || recentPremoltTags.size > 0) {
    if (progress !== null && progress >= 0.7) {
      reasons.push(
        `${daysSinceLastMolt}d since last molt (expected around ${expectedIntervalDays}d)`,
      );
    }
    if (recentPremoltTags.size > 0) {
      reasons.push(`Reported: ${[...recentPremoltTags].join(', ').replace(/-/g, ' ')}`);
    }
    return {
      ...base,
      status: 'watch',
      headline: 'Approaching molt window',
      advice: 'Feeding as normal is fine. Watch for refused prey and any thickening silk retreat.',
      reasons,
    };
  }

  // --- Not enough history to say anything useful.
  if (molts.length === 0 && feeds.length < 3) {
    return {
      ...base,
      status: 'unknown',
      headline: 'Not enough history yet',
      advice:
        'Log a few feedings and the first molt. Once there are two molts on record, the estimate switches to this spider’s own interval.',
      reasons: [],
    };
  }

  if (daysSinceLastFeed !== null && daysSinceLastFeed >= feedIntervalDays * 2) {
    reasons.push(`${daysSinceLastFeed} days since the last feeding was offered`);
  }

  return {
    ...base,
    status: 'normal',
    headline: 'Feeding normally',
    advice:
      daysSinceLastFeed !== null && daysSinceLastFeed >= feedIntervalDays
        ? 'Due for a feeding.'
        : 'Nothing to act on. Keep logging feedings so the molt estimate stays sharp.',
    reasons,
  };
}

/** Color token + label used by the badge component. */
export const STATUS_META: Record<MoltStatus, { label: string; tone: string }> = {
  'post-molt': { label: 'Just molted', tone: 'info' },
  'in-premolt': { label: 'Pre-molt', tone: 'alert' },
  'likely-premolt': { label: 'Pre-molt soon', tone: 'watch' },
  'post-rehouse': { label: 'Settling in', tone: 'info' },
  watch: { label: 'Watch', tone: 'watch' },
  normal: { label: 'Normal', tone: 'ok' },
  unknown: { label: 'New', tone: 'muted' },
};
