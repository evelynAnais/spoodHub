import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assessMolt } from './premolt.ts';
import type { Behavior, EventType, Spider, TrackEvent } from './types.ts';

/**
 * Run with `npm test`. These use Node's native TypeScript stripping, which is
 * why premolt.ts must not import anything that touches Dexie.
 */

const TODAY = new Date('2026-08-18T12:00:00.000Z');
const DAY_MS = 86_400_000;

const daysAgo = (n: number) => new Date(TODAY.getTime() - n * DAY_MS).toISOString();

function spider(overrides: Partial<Spider> = {}): Spider {
  return {
    id: 'spider-1',
    name: 'Pip',
    sex: 'female',
    archived: 0,
    createdAt: daysAgo(200),
    updatedAt: daysAgo(1),
    ...overrides,
  };
}

let seq = 0;
function event(type: EventType, at: string, extra: Partial<TrackEvent> = {}): TrackEvent {
  seq += 1;
  return {
    id: `event-${seq}`,
    spiderId: 'spider-1',
    type,
    at,
    createdAt: at,
    updatedAt: at,
    ...extra,
  };
}

const feed = (n: number, accepted: boolean) =>
  event('feed', daysAgo(n), { accepted, prey: 'Blue bottle fly' });
const molt = (n: number, newInstar?: number) => event('molt', daysAgo(n), { newInstar });
const behavior = (n: number, ...tags: Behavior[]) =>
  event('behavior', daysAgo(n), { behaviors: tags });
const rehouse = (n: number) => event('rehouse', daysAgo(n));

test('a brand new spider with no history reports unknown', () => {
  const result = assessMolt(spider(), [], TODAY);
  assert.equal(result.status, 'unknown');
  assert.equal(result.daysSinceLastMolt, null);
  assert.equal(result.refusalStreak, 0);
});

test('a spider eating normally early in its cycle is left alone', () => {
  // instar 5 expects ~22 days; 8 days in is well short of the molt window.
  const events = [feed(12, true), feed(9, true), feed(6, true), feed(3, true), molt(8, 5)];
  const result = assessMolt(spider({ instar: 5 }), events, TODAY);
  assert.equal(result.status, 'normal');
  assert.equal(result.refusalStreak, 0);
});

test('an overdue spider that is still eating readily never reads as pre-molt', () => {
  // 40 days against an expected 22 is 180% through the interval, but the
  // spider is taking every prey item offered. The calendar alone must not be
  // enough to call pre-molt, or the app nags about perfectly healthy spiders.
  const events = [molt(40, 5), feed(9, true), feed(6, true), feed(3, true)];
  const result = assessMolt(spider({ instar: 5 }), events, TODAY);
  assert.equal(result.status, 'watch');
  assert.ok(result.progress !== null && result.progress > 1);
});

test('overdue plus a single refusal is enough to escalate', () => {
  const events = [molt(40, 5), feed(9, true), feed(6, true), feed(3, false)];
  const result = assessMolt(spider({ instar: 5 }), events, TODAY);
  assert.equal(result.status, 'likely-premolt');
  assert.equal(result.refusalStreak, 1);
});

test('three refusals in a row reads as pre-molt', () => {
  const events = [feed(12, true), feed(9, false), feed(6, false), feed(3, false)];
  const result = assessMolt(spider({ instar: 5 }), events, TODAY);
  assert.equal(result.status, 'in-premolt');
  assert.equal(result.refusalStreak, 3);
  assert.match(result.advice, /Stop offering prey/);
});

test('a sealed retreat overrides everything else', () => {
  const events = [feed(3, true), behavior(2, 'sealed-retreat')];
  const result = assessMolt(spider({ instar: 5 }), events, TODAY);
  assert.equal(result.status, 'in-premolt');
  assert.match(result.advice, /do not disturb|Do not open/i);
});

test('an old sealed-retreat report is ignored once it is stale', () => {
  // Outside the 14-day window the tag should no longer drive the verdict.
  const events = [behavior(40, 'sealed-retreat'), feed(6, true), feed(3, true)];
  const result = assessMolt(spider({ instar: 5 }), events, TODAY);
  assert.notEqual(result.status, 'in-premolt');
});

test('two refusals plus webbing escalates to pre-molt', () => {
  const events = [feed(8, true), feed(5, false), feed(2, false), behavior(3, 'webbing')];
  const result = assessMolt(spider({ instar: 5 }), events, TODAY);
  assert.equal(result.status, 'in-premolt');
});

test('two refusals alone is only a warning', () => {
  const events = [feed(9, true), feed(6, false), feed(3, false)];
  const result = assessMolt(spider({ instar: 5 }), events, TODAY);
  assert.equal(result.status, 'likely-premolt');
});

test('a fresh molt blocks feeding advice', () => {
  const result = assessMolt(spider({ instar: 6 }), [molt(1, 6), feed(10, false)], TODAY);
  assert.equal(result.status, 'post-molt');
  assert.match(result.advice, /Do not feed yet/);
  assert.equal(result.daysSinceLastMolt, 1);
});

test("a spider's own molt history replaces the default interval", () => {
  // Three molts 20 days apart — the median interval should win over the
  // instar-8 default of 45 days.
  const events = [molt(60, 6), molt(40, 7), molt(20, 8)];
  const result = assessMolt(spider({ instar: 8 }), events, TODAY);
  assert.equal(result.expectedIntervalDays, 20);
  assert.equal(result.daysSinceLastMolt, 20);
  assert.equal(result.estimatedNextMolt, '2026-08-18');
});

test('the instar default is used until there are two intervals', () => {
  const result = assessMolt(spider({ instar: 4 }), [molt(5, 4)], TODAY);
  assert.equal(result.expectedIntervalDays, 18);
});

test('being far through the expected interval raises a watch', () => {
  // 34 of an expected 45 days is ~0.76 — into watch range, short of pre-molt.
  const events = [molt(34, 8), feed(6, true), feed(3, true)];
  const result = assessMolt(spider({ instar: 8 }), events, TODAY);
  assert.equal(result.status, 'watch');
  assert.ok(result.progress !== null && result.progress > 0.7);
});

test('an accepted feeding resets the refusal streak', () => {
  const events = [feed(12, false), feed(9, false), feed(6, false), feed(3, true)];
  const result = assessMolt(spider({ instar: 5 }), events, TODAY);
  assert.equal(result.refusalStreak, 0);
});

test('events are not assumed to arrive in order', () => {
  // The UI sorts newest-first; the rules must sort for themselves.
  const events = [feed(3, false), feed(9, false), feed(6, false), feed(12, true)];
  const result = assessMolt(spider({ instar: 5 }), events, TODAY);
  assert.equal(result.refusalStreak, 3);
  assert.equal(result.status, 'in-premolt');
});

test('refusals that began after a rehouse are not called pre-molt', () => {
  // The bug this guards: rehouse Tuesday, refuses Wed/Fri/Sun, and the app
  // tells you to stop feeding a spider that is only unsettled from the move.
  const events = [feed(12, true), rehouse(9), feed(7, false), feed(4, false), feed(1, false)];
  const result = assessMolt(spider({ instar: 5 }), events, TODAY);
  assert.equal(result.status, 'post-rehouse');
  assert.equal(result.refusalStreak, 3);
  assert.match(result.advice, /Keep offering/);
});

test('refusals that began before the rehouse still read as pre-molt', () => {
  // The move cannot explain refusals that predate it.
  const events = [feed(14, false), feed(11, false), rehouse(9), feed(4, false)];
  const result = assessMolt(spider({ instar: 5 }), events, TODAY);
  assert.equal(result.status, 'in-premolt');
});

test('a stale rehouse no longer excuses refused food', () => {
  // Past the 10-day stress window the disturbance stops being the likelier
  // explanation, so the ordinary pre-molt rules take over again.
  const events = [rehouse(30), feed(7, false), feed(4, false), feed(1, false)];
  const result = assessMolt(spider({ instar: 5 }), events, TODAY);
  assert.equal(result.status, 'in-premolt');
});

test('a sealed retreat outranks a recent rehouse', () => {
  // Physical evidence of a molt beats any amount of stress.
  const events = [rehouse(6), feed(4, false), feed(1, false), behavior(1, 'sealed-retreat')];
  const result = assessMolt(spider({ instar: 5 }), events, TODAY);
  assert.equal(result.status, 'in-premolt');
});

test('pre-molt behavior alongside a rehouse tips it back to pre-molt', () => {
  const events = [rehouse(8), feed(6, false), feed(3, false), behavior(2, 'webbing')];
  const result = assessMolt(spider({ instar: 5 }), events, TODAY);
  assert.equal(result.status, 'in-premolt');
});

test('a long refusal streak outgrows the rehouse explanation', () => {
  // Four refusals is more than a move usually costs.
  const events = [rehouse(9), feed(8, false), feed(6, false), feed(4, false), feed(2, false)];
  const result = assessMolt(spider({ instar: 5 }), events, TODAY);
  assert.equal(result.status, 'in-premolt');
});

test('a rehouse with the spider still eating is a non-event', () => {
  const events = [molt(8, 5), feed(6, true), rehouse(4), feed(3, true), feed(1, true)];
  const result = assessMolt(spider({ instar: 5 }), events, TODAY);
  assert.equal(result.status, 'normal');
  assert.equal(result.refusalStreak, 0);
});

test('feeding interval follows the stage, not a flat number', () => {
  // The feeding guide gives 1–2 days for spiderlings, 2–3 juveniles, 3–4 adults.
  const at = (instar: number) => assessMolt(spider({ instar }), [], TODAY).feedIntervalDays;
  assert.equal(at(2), 2, 'spiderling');
  assert.equal(at(5), 3, 'juvenile');
  assert.equal(at(8), 4, 'adult');
  // Unknown instar gets the longest interval, so an unrecorded spider is
  // under-nagged rather than over-nagged.
  assert.equal(assessMolt(spider(), [], TODAY).feedIntervalDays, 4);
});

test('an adult three days unfed is not yet due; four days is', () => {
  const events = [molt(10, 8), feed(3, true)];
  assert.equal(assessMolt(spider({ instar: 8 }), events, TODAY).feedingDue, false);

  const older = [molt(10, 8), feed(4, true)];
  assert.equal(assessMolt(spider({ instar: 8 }), older, TODAY).feedingDue, true);
});

test('a spiderling is due sooner than an adult on the same history', () => {
  const events = [feed(2, true), feed(5, true), feed(8, true)];
  assert.equal(assessMolt(spider({ instar: 2 }), events, TODAY).feedingDue, true, 'spiderling');
  assert.equal(assessMolt(spider({ instar: 8 }), events, TODAY).feedingDue, false, 'adult');
});

test('a spider that has never been fed is due', () => {
  assert.equal(assessMolt(spider({ instar: 5 }), [], TODAY).feedingDue, true);
});

test('nothing in a molt state is ever reported as due a feeding', () => {
  // This is the rule that stops the summary contradicting the spider's own page.
  const premolt = [feed(9, false), feed(6, false), feed(3, false)];
  assert.equal(assessMolt(spider({ instar: 5 }), premolt, TODAY).status, 'in-premolt');
  assert.equal(assessMolt(spider({ instar: 5 }), premolt, TODAY).feedingDue, false);

  const justMolted = [molt(1, 6), feed(30, true)];
  assert.equal(assessMolt(spider({ instar: 6 }), justMolted, TODAY).status, 'post-molt');
  assert.equal(assessMolt(spider({ instar: 6 }), justMolted, TODAY).feedingDue, false);

  const likely = [molt(40, 5), feed(9, true), feed(6, true), feed(3, false)];
  assert.equal(assessMolt(spider({ instar: 5 }), likely, TODAY).status, 'likely-premolt');
  assert.equal(assessMolt(spider({ instar: 5 }), likely, TODAY).feedingDue, false);
});

test('every verdict explains itself', () => {
  const events = [feed(9, false), feed(6, false), feed(3, false)];
  const result = assessMolt(spider({ instar: 5 }), events, TODAY);
  assert.ok(result.reasons.length > 0, 'expected at least one stated reason');
});
