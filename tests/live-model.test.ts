import { describe, expect, it } from 'vitest';
import { parseLiveSession, sessionEndsConnection } from '../src/rooms/live-model';
import { liveLocales } from '../src/locales/live';
const valid = {sessionId: 'A'.repeat(20), status: 'live', endsAt: {toMillis: () => 2000000000000}};
describe('Live classroom untrusted snapshot boundary', () => {
  it('accepts a canonical server timestamp and class state', () => {
    expect(parseLiveSession(valid)).toEqual({sessionId: valid.sessionId, status: 'live', endsAt: 2000000000000});
  });
  it('rejects wrong JSON types and coerced array identifiers', () => {
    for (const value of [null, [], 12, 'bad', {...valid, sessionId: [valid.sessionId]}, {...valid, sessionId: '../room'}]) {
      expect(parseLiveSession(value)).toBeNull();
    }
  });
  it('rejects unknown lifecycle states', () => {
    for (const status of ['open', [], null, true]) expect(parseLiveSession({...valid, status})).toBeNull();
  });
  it('rejects malformed timestamps without crashing the listener', () => {
    for (const endsAt of [null, 1, {}, {toMillis: () => { throw new Error('bad'); }}, {toMillis: 'bad'}]) {
      expect(parseLiveSession({...valid, endsAt})).toBeNull();
    }
  });
  it('rejects nonfinite, nonnumeric or nonpositive expiry values', () => {
    for (const endsAt of [NaN, Infinity, -1, 0, '2000000000000']) {
      expect(parseLiveSession({...valid, endsAt: {toMillis: () => endsAt}})).toBeNull();
    }
  });
  it('keeps every classroom control and error label available in ES, EN and PT', () => {
    const keys = Object.keys(liveLocales.es).sort();
    expect(Object.keys(liveLocales.en).sort()).toEqual(keys);
    expect(Object.keys(liveLocales.pt).sort()).toEqual(keys);
    for (const language of Object.values(liveLocales)) expect(Object.values(language).every(value => value.trim().length > 0)).toBe(true);
  });
});

describe('Delayed class lifecycle events', () => {
  const current = {sessionId: 'B'.repeat(20), status: 'live' as const, endsAt: 2000000000000};
  it('keeps a new join alive when an old class closing/ended event arrives late', () => {
    for (const status of ['closing','ended'] as const) {
      expect(sessionEndsConnection({...current, sessionId: 'A'.repeat(20), status}, current.sessionId, false)).toBe(false);
      expect(sessionEndsConnection({...current, sessionId: 'A'.repeat(20), status}, current.sessionId, true)).toBe(false);
    }
  });
  it('cancels both a pending and connected participant when their own class closes', () => {
    for (const status of ['closing','ended'] as const) for (const connected of [false,true])
      expect(sessionEndsConnection({...current,status},current.sessionId,connected)).toBe(true);
  });
  it('ignores an initial empty cache while joining but disconnects an established call if its state disappears', () => {
    expect(sessionEndsConnection(null,current.sessionId,false)).toBe(false);
    expect(sessionEndsConnection(null,current.sessionId,true)).toBe(true);
  });
  it('keeps a live/starting class connected and has no effect without a join attempt', () => {
    expect(sessionEndsConnection(current,current.sessionId,true)).toBe(false);
    expect(sessionEndsConnection({...current,status:'starting'},current.sessionId,false)).toBe(false);
    expect(sessionEndsConnection(null,null,false)).toBe(false);
  });
});
