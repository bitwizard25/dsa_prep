import test from 'node:test';
import assert from 'node:assert/strict';
import { hoursNeeded, schedule, countStudyDays, scheduleCacheKey } from '../src/renderer/core/plan.js';

test('deadline hours account for whole problems fitting into days', () => {
  const queue = Array.from({ length: 3 }, () => ({ d: 'H' }));
  const hours = hoursNeeded(queue, '2026-10-29', '2026-10-30', 5);
  assert.equal(hours, 2);
  assert.ok(schedule(queue, { hoursPerDay: hours, daysPerWeek: 5, startDate: '2026-10-29' }).at(-1).date <= '2026-10-30');
});

test('deadline planning skips weekends and reports impossible dates', () => {
  assert.equal(countStudyDays('2026-10-30', '2026-11-02', 5), 2);
  assert.equal(hoursNeeded([{ d: 'M' }], '2026-10-31', '2026-11-01', 5), null);
  assert.equal(hoursNeeded([{ d: 'M' }], '2026-11-02', '2026-10-30', 7), null);
});

test('count-based schedules reject fractional problem counts', () => {
  assert.throws(() => schedule([{ d: 'E' }, { d: 'H' }], {
    hoursPerDay: 1, daysPerWeek: 7, startDate: '2026-10-29', problemsPerDay: 0.5,
  }), /problemsPerDay/);
});

test('the schedule cache key includes the whole queue and the settings', () => {
  const profile = { hoursPerDay: 2, daysPerWeek: 6, startDate: '2026-10-29', problemsPerDay: 3 };
  const a = [{ slug: 'two-sum', d: 'E' }, { slug: '3sum', d: 'M' }, { slug: 'lru-cache', d: 'M' }];
  const b = [{ slug: 'two-sum', d: 'E' }, { slug: 'trapping-rain-water', d: 'H' }, { slug: 'lru-cache', d: 'M' }];
  assert.notEqual(scheduleCacheKey(profile, a), scheduleCacheKey(profile, b));
  assert.notEqual(scheduleCacheKey(profile, a), scheduleCacheKey({ ...profile, startDate: '2026-11-02' }, a));
  assert.notEqual(scheduleCacheKey(profile, a), scheduleCacheKey({ ...profile, problemsPerDay: 1 }, a));
  assert.equal(scheduleCacheKey(profile, a), scheduleCacheKey({ ...profile }, a.map((p) => ({ ...p }))));
});

test('count-based schedules preserve every problem exactly once', () => {
  const queue = Array.from({ length: 7 }, (_, id) => ({ id, d: 'M' }));
  const days = schedule(queue, { hoursPerDay: 1, daysPerWeek: 5, startDate: '2026-10-30', problemsPerDay: 3 });
  assert.deepEqual(days.map(d => d.date), ['2026-10-30', '2026-11-02', '2026-11-03']);
  assert.deepEqual(days.flatMap(d => d.items), queue);
});
