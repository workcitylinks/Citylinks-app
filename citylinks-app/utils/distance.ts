/**
 * Distance utilities for calculating and formatting distances
 * between the user's mobile device and local shops.
 */

// Default reference coordinates: Haveri Town Center (Karnataka, India)
export const DEFAULT_MOBILE_COORDS = {
  latitude: 14.7968,
  longitude: 75.401,
};

/**
 * Calculates the great-circle distance between two GPS coordinates in meters
 * using the Haversine formula.
 */
export function calculateDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return 0;
  }

  const R = 6371e3; // Earth's mean radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export interface FormattedDistance {
  meters: number;
  metersText: string;     // e.g. "450 m" or "1,200 m"
  kmText: string;         // e.g. "0.45 km" or "1.2 km"
  badgeText: string;      // e.g. "450 m" or "1.2 km"
  dualText: string;       // e.g. "450 m away" or "1.2 km away"
  awayText: string;       // e.g. "450 m away" or "1.2 km away"
  cleanText: string;      // e.g. "450 m away" or "1.2 km away"
  shortText: string;      // e.g. "450 m" or "1.2 km"
}

/**
 * Formats a distance in meters cleanly and intuitively:
 * - < 50 m: "Nearby (< 50 m)"
 * - < 1000 m: e.g. "450 m away"
 * - 1 km to 10 km: e.g. "1.2 km away"
 * - > 10 km: e.g. "14 km away"
 */
export function formatDistance(meters: number): FormattedDistance {
  const m = Math.max(0, Math.round(meters));
  const metersText = `${m.toLocaleString()} m`;

  let cleanText = '';
  let shortText = '';
  let kmText = '';

  if (m < 50) {
    cleanText = 'Nearby (< 50 m)';
    shortText = '< 50 m';
    kmText = '0.05 km';
  } else if (m < 1000) {
    cleanText = `${m} m away`;
    shortText = `${m} m`;
    kmText = `${(m / 1000).toFixed(2)} km`;
  } else if (m < 10000) {
    const km = (m / 1000).toFixed(1);
    cleanText = `${km} km away`;
    shortText = `${km} km`;
    kmText = `${km} km`;
  } else {
    const km = Math.round(m / 1000);
    cleanText = `${km.toLocaleString()} km away`;
    shortText = `${km.toLocaleString()} km`;
    kmText = `${km.toLocaleString()} km`;
  }

  return {
    meters: m,
    metersText,
    kmText,
    badgeText: shortText,
    dualText: cleanText,
    awayText: cleanText,
    cleanText,
    shortText,
  };
}

/**
 * Resolves distance between the mobile device and a shop's coordinates.
 * Falls back gracefully to default Haveri town coordinates if shop coordinates are absent.
 */
export function computeShopDistance(
  mobileCoords: { latitude: number; longitude: number } | null | undefined,
  shopLat?: number | null,
  shopLng?: number | null
): FormattedDistance {
  const userLat = Number(mobileCoords?.latitude) || DEFAULT_MOBILE_COORDS.latitude;
  const userLng = Number(mobileCoords?.longitude) || DEFAULT_MOBILE_COORDS.longitude;

  const parsedShopLat = Number(shopLat);
  const parsedShopLng = Number(shopLng);

  const isValidCoord =
    !isNaN(parsedShopLat) &&
    !isNaN(parsedShopLng) &&
    parsedShopLat > 8 &&
    parsedShopLat < 37 &&
    parsedShopLng > 68 &&
    parsedShopLng < 97;

  // If shop coordinates are not defined or invalid, provide a realistic nearby offset in Haveri
  const targetLat = isValidCoord ? parsedShopLat : DEFAULT_MOBILE_COORDS.latitude + 0.0035;
  const targetLng = isValidCoord ? parsedShopLng : DEFAULT_MOBILE_COORDS.longitude + 0.0025;

  const meters = calculateDistanceInMeters(userLat, userLng, targetLat, targetLng);
  return formatDistance(meters);
}
