import { describe, it, expect } from 'vitest';
import { parseSkiddleEvent } from './skiddle.js';

function makeRaw(openingtimes: { doorsopen?: string; doorsclose?: string }) {
  return {
    id: 1,
    eventname: 'Club Night',
    description: '',
    date: '2026-03-06',
    openingtimes,
    venue: {
      id: 1,
      name: 'Hot Box',
      address: '',
      town: 'Chelmsford',
      postcode: '',
      latitude: 51.7,
      longitude: 0.47,
    },
    EventCode: 'CLUB',
    entryprice: '5',
    link: 'https://example.com',
  };
}

describe('parseSkiddleEvent', () => {
  it('rolls an after-midnight closing time into the next day', () => {
    const ev = parseSkiddleEvent(makeRaw({ doorsopen: '21:00', doorsclose: '03:00' }));
    expect(ev.endDate!.getTime()).toBeGreaterThan(ev.startDate.getTime());
    expect(ev.endDate!.getTime() - ev.startDate.getTime()).toBe(6 * 60 * 60 * 1000);
  });

  it('keeps a same-day closing time on the same day', () => {
    const ev = parseSkiddleEvent(makeRaw({ doorsopen: '19:00', doorsclose: '23:00' }));
    expect(ev.endDate!.getTime() - ev.startDate.getTime()).toBe(4 * 60 * 60 * 1000);
  });
});
