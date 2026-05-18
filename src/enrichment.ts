import type { CmEvent, EventEnrichment } from './types.js';

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_SEARCH_URL = 'https://api.spotify.com/v1/search';
const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

interface SpotifyTokenResponse {
  access_token: string;
}

interface SpotifySearchResponse {
  artists?: {
    items?: Array<{
      name: string;
      external_urls?: {
        spotify?: string;
      };
    }>;
  };
}

interface YouTubeSearchResponse {
  items?: Array<{
    id?: {
      channelId?: string;
    };
    snippet?: {
      channelTitle?: string;
    };
  }>;
}

export interface EnrichmentOptions {
  spotifyClientId?: string;
  spotifyClientSecret?: string;
  youtubeApiKey?: string;
}

function normaliseName(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\b(the|official|music|topic)\b/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesMatch(a: string, b: string): boolean {
  const normalisedA = normaliseName(a);
  const normalisedB = normaliseName(b);
  return normalisedA.length >= 3 && normalisedA === normalisedB;
}

export function extractLikelyArtistName(event: CmEvent): string | null {
  if (event.category !== 'live-music') return null;

  const candidate = event.title
    .replace(/\([^)]*(tickets?|live|tour|concert|show)[^)]*\)/gi, '')
    .replace(/\[[^\]]*(tickets?|live|tour|concert|show)[^\]]*\]/gi, '')
    .split(/\s+(?:at|@|with|plus|ft\.?|feat\.?|featuring|presents)\s+/i)[0]
    .split(/\s+[+|/]\s+/)[0]
    .split(/\s+-\s+/)[0]
    .trim();

  if (candidate.length < 3 || candidate.length > 80) return null;
  if (/\b(open mic|jam night|tribute|karaoke|disco|dj set|club night)\b/i.test(candidate)) {
    return null;
  }

  return candidate;
}

async function getSpotifyToken(clientId: string, clientSecret: string): Promise<string> {
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });

  if (!res.ok) {
    throw new Error(`Spotify auth failed: HTTP ${res.status}`);
  }

  const data = (await res.json()) as SpotifyTokenResponse;
  return data.access_token;
}

async function findSpotifyArtist(
  artistName: string,
  accessToken: string
): Promise<Pick<EventEnrichment, 'artistName' | 'spotifyUrl'> | null> {
  const params = new URLSearchParams({
    q: artistName,
    type: 'artist',
    limit: '5',
  });
  const res = await fetch(`${SPOTIFY_SEARCH_URL}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Spotify search failed: HTTP ${res.status}`);
  }

  const data = (await res.json()) as SpotifySearchResponse;
  const match = data.artists?.items?.find(item => namesMatch(item.name, artistName));
  const spotifyUrl = match?.external_urls?.spotify;
  if (!match || !spotifyUrl) return null;

  return {
    artistName: match.name,
    spotifyUrl,
  };
}

async function findYouTubeChannel(artistName: string, apiKey: string): Promise<string | null> {
  const params = new URLSearchParams({
    part: 'snippet',
    q: artistName,
    type: 'channel',
    maxResults: '5',
    key: apiKey,
  });
  const res = await fetch(`${YOUTUBE_SEARCH_URL}?${params}`);

  if (!res.ok) {
    throw new Error(`YouTube search failed: HTTP ${res.status}`);
  }

  const data = (await res.json()) as YouTubeSearchResponse;
  const match = data.items?.find(item => {
    const title = item.snippet?.channelTitle;
    return title ? namesMatch(title, artistName) : false;
  });
  const channelId = match?.id?.channelId;
  return channelId ? `https://www.youtube.com/channel/${channelId}` : null;
}

export async function enrichEvents(
  events: CmEvent[],
  options: EnrichmentOptions = {
    spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
    spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    youtubeApiKey: process.env.YOUTUBE_API_KEY,
  }
): Promise<CmEvent[]> {
  let spotifyToken: string | null = null;
  const canUseSpotify = Boolean(options.spotifyClientId && options.spotifyClientSecret);
  const canUseYouTube = Boolean(options.youtubeApiKey);

  if (!canUseSpotify && !canUseYouTube) {
    return events;
  }

  const enriched: CmEvent[] = [];
  const spotifyCache = new Map<
    string,
    Promise<Pick<EventEnrichment, 'artistName' | 'spotifyUrl'> | null>
  >();
  const youtubeCache = new Map<string, Promise<string | null>>();

  for (const event of events) {
    const artistName = extractLikelyArtistName(event);
    if (!artistName) {
      enriched.push(event);
      continue;
    }

    const enrichment: EventEnrichment = { confidence: 'high' };

    try {
      if (canUseSpotify && options.spotifyClientId && options.spotifyClientSecret) {
        spotifyToken ??= await getSpotifyToken(
          options.spotifyClientId,
          options.spotifyClientSecret
        );
        const artistKey = normaliseName(artistName);
        let spotifyArtistPromise = spotifyCache.get(artistKey);
        if (!spotifyArtistPromise) {
          spotifyArtistPromise = findSpotifyArtist(artistName, spotifyToken);
          spotifyCache.set(artistKey, spotifyArtistPromise);
        }
        const spotifyArtist = await spotifyArtistPromise;
        if (spotifyArtist) {
          enrichment.artistName = spotifyArtist.artistName;
          enrichment.spotifyUrl = spotifyArtist.spotifyUrl;
        }
      }

      const channelArtistName = enrichment.artistName ?? artistName;
      if (canUseYouTube && options.youtubeApiKey && enrichment.spotifyUrl) {
        const artistKey = normaliseName(channelArtistName);
        let youtubeUrlPromise = youtubeCache.get(artistKey);
        if (!youtubeUrlPromise) {
          youtubeUrlPromise = findYouTubeChannel(channelArtistName, options.youtubeApiKey);
          youtubeCache.set(artistKey, youtubeUrlPromise);
        }
        const youtubeUrl = await youtubeUrlPromise;
        if (youtubeUrl) {
          enrichment.artistName = channelArtistName;
          enrichment.youtubeUrl = youtubeUrl;
        }
      }
    } catch {
      enriched.push(event);
      continue;
    }

    if (enrichment.spotifyUrl || enrichment.youtubeUrl) {
      enriched.push({ ...event, enrichment });
    } else {
      enriched.push(event);
    }
  }

  return enriched;
}
