import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openHealthConcerns } from './health.ts';
import type { EventType, HealthConcern, TrackEvent } from './types.ts';

const TODAY = new Date('2026-08-18T12:00:00.000Z');
const DAY_MS = 86_400_000;
const daysAgo = (n: number) => new Date(TODAY.getTime() - n * DAY_MS).toISOString();

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

const health = (n: number, concern: HealthConcern, resolved = false) =>
  event('health', daysAgo(n), { concern, resolved });

test('no health entries means nothing open', () => {
  assert.deepEqual(openHealthConcerns([event('feed', daysAgo(1))]), []);
});

test('an unresolved concern stays open', () => {
  const open = openHealthConcerns([health(5, 'injury')]);
  assert.equal(open.length, 1);
  assert.equal(open[0].concern, 'injury');
});

test('a later resolved entry clears the same concern', () => {
  const open = openHealthConcerns([health(10, 'injury'), health(2, 'injury', true)]);
  assert.deepEqual(open, []);
});

test('resolving one concern leaves an unrelated one open', () => {
  const open = openHealthConcerns([
    health(10, 'injury'),
    health(8, 'dehydration'),
    health(2, 'injury', true),
  ]);
  assert.equal(open.length, 1);
  assert.equal(open[0].concern, 'dehydration');
});

test('a concern can reopen after being resolved', () => {
  const open = openHealthConcerns([
    health(20, 'limb-loss'),
    health(10, 'limb-loss', true),
    health(1, 'limb-loss'),
  ]);
  assert.equal(open.length, 1);
  assert.equal(open[0].since, daysAgo(1));
});

test('order of entries does not matter', () => {
  const open = openHealthConcerns([health(2, 'injury', true), health(10, 'injury')]);
  assert.deepEqual(open, []);
});
