import type { CmEvent } from '../types';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function hasCoordinates(
  event: CmEvent
): event is CmEvent & { latitude: number; longitude: number } {
  return Number.isFinite(event.latitude) && Number.isFinite(event.longitude);
}

export function calculateDistanceMiles(from: Coordinates, to: Coordinates): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getEventDistanceMiles(event: CmEvent, from: Coordinates | null): number | null {
  if (!from || !hasCoordinates(event)) return null;

  return calculateDistanceMiles(from, {
    latitude: event.latitude,
    longitude: event.longitude,
  });
}

export function formatDistanceMiles(distanceMiles: number): string {
  if (distanceMiles < 0.1) return 'Nearby';
  if (distanceMiles < 10) return `${distanceMiles.toFixed(1)} mi away`;
  return `${Math.round(distanceMiles)} mi away`;
}
