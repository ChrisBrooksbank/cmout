export interface CmEvent {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date | null;
  venue: string;
  address: string;
  category: EventCategory;
  source: EventSource;
  sourceUrl: string;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  price: string | null;
}

export type EventCategory =
  | 'live-music'
  | 'theatre-comedy'
  | 'festival'
  | 'fitness-class'
  | 'community'
  | 'library'
  | 'church-faith'
  | 'sport'
  | 'kids'
  | 'pub-bar'
  | 'other';

export type EventSource =
  | 'openactive'
  | 'skiddle'
  | 'ents24'
  | 'ticketmaster'
  | 'ical'
  | 'dice'
  | 'wegottickets'
  | 'meetup'
  | 'eventbrite'
  | 'user-submitted';

export interface FetchResult {
  source: EventSource;
  events: CmEvent[];
  errors: string[];
  fetchedAt: Date;
  durationMs: number;
}

export interface Fetcher {
  name: EventSource;
  fetch(): Promise<FetchResult>;
}
