import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CmEvent } from './types.js';
import { enrichEvents, extractLikelyArtistName } from './enrichment.js';

function makeEvent(overrides: Partial<CmEvent> = {}): CmEvent {
  return {
    id: 'evt-1',
    title: 'The Example Band',
    description: '',
    startDate: new Date('2026-03-10T20:00:00Z'),
    endDate: null,
    venue: 'Hot Box',
    address: 'Chelmsford',
    category: 'live-music',
    source: 'skiddle',
    sourceUrl: 'https://example.com/event',
    latitude: null,
    longitude: null,
    imageUrl: null,
    price: null,
    promoter: null,
    ...overrides,
  };
}

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('extractLikelyArtistName', () => {
  it('extracts the leading artist name from a live music event title', () => {
    expect(extractLikelyArtistName(makeEvent({ title: 'The Example Band + Support' }))).toBe(
      'The Example Band'
    );
  });

  it('ignores non-music events', () => {
    expect(extractLikelyArtistName(makeEvent({ category: 'community' }))).toBeNull();
  });

  it('ignores generic music nights', () => {
    expect(extractLikelyArtistName(makeEvent({ title: 'Open Mic Night' }))).toBeNull();
  });
});

describe('enrichEvents', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns events unchanged when no enrichment credentials are configured', async () => {
    const events = [makeEvent()];

    await expect(enrichEvents(events, {})).resolves.toBe(events);
  });

  it('adds Spotify and YouTube links for high-confidence artist matches', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'token' }))
      .mockResolvedValueOnce(
        jsonResponse({
          artists: {
            items: [
              {
                name: 'The Example Band',
                external_urls: {
                  spotify: 'https://open.spotify.com/artist/example',
                },
              },
            ],
          },
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              id: { channelId: 'UCexample' },
              snippet: { channelTitle: 'The Example Band' },
            },
          ],
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    const [event] = await enrichEvents([makeEvent()], {
      spotifyClientId: 'client-id',
      spotifyClientSecret: 'client-secret',
      youtubeApiKey: 'youtube-key',
    });

    expect(event.enrichment).toEqual({
      artistName: 'The Example Band',
      spotifyUrl: 'https://open.spotify.com/artist/example',
      youtubeUrl: 'https://www.youtube.com/channel/UCexample',
      confidence: 'high',
    });
  });

  it('does not enrich when Spotify cannot confidently match the artist', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'token' }))
      .mockResolvedValueOnce(
        jsonResponse({
          artists: {
            items: [
              {
                name: 'A Different Band',
                external_urls: {
                  spotify: 'https://open.spotify.com/artist/different',
                },
              },
            ],
          },
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    const [event] = await enrichEvents([makeEvent()], {
      spotifyClientId: 'client-id',
      spotifyClientSecret: 'client-secret',
    });

    expect(event.enrichment).toBeUndefined();
  });
});
