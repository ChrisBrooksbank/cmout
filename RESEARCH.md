# Chelmsford Local Events PWA — Research & Data Sourcing

## Project Goal

Build a PWA for Chelmsford, Essex residents to discover local events: live music, community events, classes, and clubs. The critical question is whether event data can be sourced automatically via feeds/APIs rather than manual entry.

**Short answer: Yes, but no single source covers everything. A multi-source approach is needed.**

---

## Tier 1: Free APIs with Structured JSON (Best Options)

### Skiddle API — UK-Focused, Best Free Entertainment Source
- **Covers**: Live music, clubs, festivals, theatre, comedy, kids events, sport, pub events (12 categories)
- **Chelmsford**: Already lists events at Civic Theatre, Hylands Estate, Hot Box Live, local pubs
- **Access**: Free API key via https://www.skiddle.com/api/join.php
- **Location filter**: `latitude=51.7356&longitude=0.4685&radius=10`
- **Format**: REST JSON
- **Status**: Fetcher implemented, needs API key

### Ents24 API — UK's Largest Entertainment Database
- **Covers**: Music, comedy, theatre — claims 10,000+ new listings/week
- **Chelmsford**: Lists events at Hylands Park and other local venues
- **Access**: Free registration at https://developers.ents24.com/
- **Location filter**: `location=name:Chelmsford` or `location=postcode:CM1` or `location=geo:51.7356,0.4685`
- **Format**: REST JSON (OAuth2 client_credentials flow)
- **Status**: Fetcher implemented, needs client ID + secret

### Ticketmaster Discovery API — Largest Ticketed Events
- **Covers**: Concerts, sports, theatre at major venues
- **Chelmsford**: Racecourse, Theatre, larger venues
- **Access**: Free, no approval needed — https://developer.ticketmaster.com/
- **Location filter**: `city=Chelmsford&countryCode=GB` or `latlong=51.7356,0.4685&radius=10`
- **Limits**: 5,000 requests/day, 2 req/sec (generous)
- **Format**: REST JSON
- **Status**: Fetcher implemented, needs API key

### OpenActive — Fitness, Classes & Sports (Open Data, No Auth)
- **Covers**: Gym classes, fitness sessions, court bookings, sports clubs, courses
- **Chelmsford**: **Chelmsford City Sports is a confirmed publisher** covering all 4 leisure centres (Riverside, Sport & Athletics Centre, South Woodham Ferrers, Dovedale)
- **Access**: Completely free, no API key needed, CC-BY 4.0 licence
- **Live feed endpoints** (updated every minute, 14-day lookahead):
  - `https://opendata.leisurecloud.live/api/feeds/ChelmsfordCitySports-live-session-series`
  - `https://opendata.leisurecloud.live/api/feeds/ChelmsfordCitySports-live-scheduled-sessions`
  - `https://opendata.leisurecloud.live/api/feeds/ChelmsfordCitySports-live-facility-uses`
  - `https://opendata.leisurecloud.live/api/feeds/ChelmsfordCitySports-live-slots`
  - `https://opendata.leisurecloud.live/api/feeds/ChelmsfordCitySports-live-course-instance`
- **Format**: JSON-LD via RPDE (Realtime Paged Data Exchange) feeds
- **How it works**: Page through data following `next` URLs. Poll last page periodically for updates. Deleted items flagged with `"state": "deleted"`.
- **Status**: WORKING — **12,405 raw items → 1,185 deduplicated events** across 14 days from 4 venues
- **Verified venues**: Riverside Leisure Centre (689 events), Chelmsford Sport & Athletics Centre (332), South Woodham Leisure (106), Dovedale Sports Centre (47)
- **Event types confirmed**: Body Combat, Lane Swim, Pilates, Netball, Public Skate, Aqua Deep, Soft Play, Spin, Yoga, Express Circuit, Les Mills, Forever Fit, and many more

---

## Key Chelmsford Venues — Data Source Coverage

### Hot Box Live (28 Viaduct Road, CM1 1TS)
- **What it is**: Live music venue & bar in railway viaducts. Indie, rock, punk, metal, jazz, blues, hip hop, comedy, open mic
- **Website**: https://www.hotboxlive.co.uk/ (built on Square Online, NOT WordPress)
- **RSS feed**: None (404 on /feed)
- **JSON-LD**: None on site or DICE venue page
- **Events source**: Uses a **DICE.FM widget** (partner ID `5d5a7e86`) to display events
- **DICE API**: Partner-only, no public endpoint found
- **Skiddle**: [Listed with events](https://www.skiddle.com/whats-on/Chelmsford/Hot-Box-Live-Events-28-Viaduct-Road-Chelmsford-CM1-1TS/) — will be picked up by Skiddle fetcher
- **Coverage gap**: Smaller events (Chess Club, Open Mic Night, Retro Gaming, Poetry nights, Blues Jam) may only appear on DICE, not Skiddle
- **Mitigation**: DICE venue page scrape or user submissions

### Chelmsford Theatre (formerly Civic Theatre)
- **Covered by**: Skiddle, Ents24, Ticketmaster
- **No additional fetcher needed**

### Cramphorn Studio (adjoining the Civic Theatre)
- **What it is**: Intimate studio theatre (139-165 seats), smaller touring shows, amateur theatre, live music, lunchtime concerts
- **Covered by**: Skiddle, Ents24 (as part of Chelmsford Theatre complex)

### Chelmsford City Racecourse
- **Covered by**: Ticketmaster, Skiddle

### Hylands House / Hylands Estate
- **Covered by**: Skiddle, Ents24, Ticketmaster (large events like festivals)
- **Hot Box also uses "The Stables, Hylands House"** as an overflow venue (in DICE widget config)

---

## Tier 2: Worth Investigating

| Source | What it covers | Cost | Notes |
|--------|---------------|------|-------|
| **AllEvents.in** | Broad aggregator, already has Chelmsford page | Unknown (contact) | https://allevents.in/chelmsford/all |
| **SerpApi Google Events** | Scrapes Google's event search results | Free tier, then ~$50/mo | Broadest coverage but scraping-based |
| **Outsavvy** | UK ticketed social/cultural events | Free API (partner account, 5k calls/day) | Uncertain Chelmsford coverage |

---

## Tier 3: Feed-Based Sources (iCal / RSS)

These provide structured data but need individual integration:

- **Essex Libraries** (LibCal platform) — supports iCal feed subscription for library events
- **A Church Near You** (Church of England) — iCal export for church events including Chelmsford Cathedral concerts
- **Meetup.com** — provides iCal feeds per group (but API requires paid Pro subscription at ~$30/mo)
- **WordPress-based community sites** — auto-generate RSS at `/feed/` (check chelmsfordforyou.co.uk, local group sites)

**Status**: Generic iCal fetcher implemented, needs feed URLs configured via `ICAL_FEED_URLS` env var

---

## Tier 4: Scraping Required (No API/Feed)

| Source | Value | Approach |
|--------|-------|----------|
| **Chelmsford City Council** (citylife.chelmsford.gov.uk/whats-on) | High — hyper-local council events | Check for hidden RSS feeds first. Scrape factual data only (title, date, time, venue, link). |
| **chelmsford.gov.uk events pages** | High — parks, festivals, community events | Multiple sub-pages to monitor |
| **Visit Essex** (visitessex.com/chelmsford/events) | Medium — tourism events | Likely overlaps with council data |
| **Chelmsford Theatre** | Medium | Already indexed by Skiddle/Ents24, so prefer those APIs |
| **Hot Box Live (DICE page)** | Medium — long-tail events | DICE venue page has structured HTML, parseable |

**Legal notes for scraping UK sites:**
- Factual data (event name, date, time, venue) is lower risk than copying creative descriptions
- Respect robots.txt and Terms of Service
- Link back to original source for full details
- Extract minimal data only
- UK Database Rights (1997) protect curated databases — don't bulk-copy entire listings

---

## Dead Ends (Don't Bother)

| Source | Why |
|--------|-----|
| **Eventbrite API** | Search endpoint deprecated Feb 2020. Can only query by known event/org ID. |
| **Meetup API** | Requires ~$30/mo Pro subscription |
| **Facebook Events** | API deprecated/restricted. No programmatic access to discover events. This is the biggest gap — many community events are Facebook-only. |
| **Dice.fm API** | Partner-only API |
| **Songkick** | Commercial licence required |
| **PredictHQ** | Enterprise pricing, overkill for this use case |
| **hotboxlive.co.uk RSS** | Square Online platform, no RSS support, returns 404 |

---

## The Facebook Gap

The single biggest data gap is **Facebook Events**. Many community events, pub quizzes, small gig nights, charity events, and informal groups only post on Facebook. Meta has progressively locked down API access — there is no legal programmatic way to discover Facebook Events. This is a known industry-wide problem.

**Mitigation**: User-submitted events and community partnerships are the only viable way to capture this long tail.

---

## Recommended Architecture

### Data Sources (by event category)

| Category | Primary Source | Secondary Source |
|----------|---------------|-----------------|
| Live music | Skiddle, Ents24 | Ticketmaster |
| Theatre/comedy | Ents24, Skiddle | Ticketmaster |
| Festivals | Skiddle, Ticketmaster | Council scrape |
| Fitness/classes | **OpenActive** (Chelmsford City Sports) | — |
| Community events | Council scrape + user submissions | iCal feeds |
| Library events | Essex Libraries iCal | — |
| Church/faith events | A Church Near You iCal | — |
| Pub/bar events | Skiddle | User submissions |

### Refresh Frequencies

| Source | Refresh interval | Rationale |
|--------|-----------------|-----------|
| OpenActive feeds | Every 5-15 minutes | Updates every minute, 14-day window |
| Skiddle / Ents24 / Ticketmaster | Every 4-6 hours | Events stable once listed |
| iCal feeds (libraries, churches) | Every 12-24 hours | Low-change frequency |
| Scraped sources (council) | Every 24 hours | Be gentle on source servers |
| User-submitted events | Real-time | Already in your database |

### Caching Strategy for the PWA

- **IndexedDB** for event data (not localStorage — async, larger capacity)
- **Cache API** (Service Worker) for static assets and images
- **Stale-while-revalidate** pattern: show cached data instantly, update in background
- **Pre-cache** next 14 days of events for offline use
- **Background Sync API** for queuing user submissions while offline
- **Daily cleanup** of past events (keep 2hr grace period for "happening now")
- Show "Last updated X hours ago" when cached data is stale (>24hrs)

### User-Submitted Events (Filling the Gaps)

Essential for the "long tail" — pub quizzes, car boot sales, charity events, school fairs, informal meetups. Recommended approach:
- Pre-moderate first-time submitters (auto-approve after 2-3 approved events)
- Structured submission form (date picker, venue dropdown, category select) to reduce spam
- Community reporting ("flag" button) for incorrect/inappropriate events
- Allow venues to claim profiles and become trusted auto-approved submitters

---

## Prototype Verification Results

### OpenActive (tested 2026-03-01)
- **Status**: FULLY WORKING
- **Raw items fetched**: 12,405 across 5 RPDE feeds
- **Deduplicated events**: 1,185 over a 14-day window
- **Venues**: Riverside Leisure Centre (689), CSAC (332), South Woodham Leisure (106), Dovedale Sports Centre (47)
- **Categories**: fitness-class (1,170), sport (13), kids (2)
- **Implementation note**: Session-series must be fetched first to build a name lookup map, then scheduled-sessions are resolved against it (they reference parent series by URL, not by embedded name)

### Skiddle, Ents24, Ticketmaster (pending API keys)
- Fetchers implemented and type-checked
- Awaiting API key registration to test

### iCal (pending feed discovery)
- Generic fetcher implemented
- Need to discover actual feed URLs for Essex Libraries, A Church Near You, etc.

---

## Next Steps

1. **Get API keys**: Sign up for Skiddle, Ents24, Ticketmaster (all free)
2. **Test paid API sources**: Run `npm run fetch:all` with keys in `.env`
3. **Find iCal feeds**: Investigate Essex Libraries LibCal and A Church Near You for .ics URLs
4. **Estimate coverage**: Compare combined API results against manual browsing to identify gaps
5. **Consider DICE scrape**: For Hot Box Live long-tail events not on Skiddle
6. **Design the PWA frontend**: Once data coverage is validated
