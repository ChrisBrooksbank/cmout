# Event Listing UI

## Overview

A React-based UI that displays local Chelmsford events in a browsable, filterable list.

## User Stories

- As a Chelmsford resident, I want to see upcoming local events so that I can find things to do
- As a user, I want to filter events by category so that I can find events I'm interested in
- As a user, I want to search events by name so that I can find specific events quickly
- As a user, I want to see event details (date, time, venue, description) so that I can decide whether to attend

## Requirements

- [ ] React app with Vite as the build tool
- [ ] Event list view showing upcoming events sorted by date
- [ ] Event card component showing: title, date/time, venue, category, brief description
- [ ] Event detail view with full information
- [ ] Category filter (sports, music, arts, community, etc.)
- [ ] Text search across event titles and descriptions
- [ ] Date range filter (today, this week, this month)
- [ ] Responsive design that works on mobile and desktop
- [ ] Loading states and error handling
- [ ] API integration layer to fetch events from the aggregator

## Acceptance Criteria

- [ ] Events display in chronological order
- [ ] Filtering by category reduces the displayed events
- [ ] Search returns relevant results
- [ ] UI is usable on a 375px wide screen
- [ ] All components have unit tests
- [ ] Loading and error states are handled gracefully

## Out of Scope

- User accounts or authentication
- Event creation or editing
- Social features (sharing, commenting)
- Map view (covered in a future spec)
