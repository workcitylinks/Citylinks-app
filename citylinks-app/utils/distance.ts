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
  kmText: string;         // e.g. "0.45 km" or "1.20 km"
  badgeText: string;      // e.g. "450 m (0.45 km)" or "1.20 km (1,200 m)"
  dualText: string;       // e.g. "450 m • 0.45 km" or "1.2 km • 1,200 m"
  awayText: string;       // e.g. "450 m away (0.45 km)" or "1.2 km away (1,200 m)"
}

/**
 * Formats a distance in meters into both meters (m) and kilometers (km).
 */
export function formatDistance(meters: number): FormattedDistance {
  const m = Math.max(0, Math.round(meters));
  const km = (m / 1000).toFixed(m < 1000 ? 2 : 1);
  const formattedM = m.toLocaleString();

  if (m < 1000) {
    return {
      meters: m,
      metersText: `${formattedM} m`,
      kmText: `${km} km`,
      badgeText: `${formattedM} m (${km} km)`,
      dualText: `${formattedM} m • ${km} km`,
      awayText: `${formattedM} m away (${km} km)`,
    };
  }

  return {
    meters: m,
    metersText: `${formattedM} m`,
    kmText: `${km} km`,
    badgeText: `${km} km (${formattedM} m)`,
    dualText: `${km} km • ${formattedM} m`,
    awayText: `${km} km away (${formattedM} m)`,
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
  const userLat = mobileCoords?.latitude ?? DEFAULT_MOBILE_COORDS.latitude;
  const userLng = mobileCoords?.longitude ?? DEFAULT_MOBILE_COORDS.longitude;

  // If shop coordinates are not defined, provide a realistic nearby offset in Haveri
  const targetLat =
    shopLat != null && !isNaN(shopLat)
      ? shopLat
      : DEFAULT_MOBILE_COORDS.latitude + 0.0035;
  const targetLng =
    shopLng != null && !isNaN(shopLng)
      ? shopLng
      : DEFAULT_MOBILE_COORDS.longitude + 0.0025;

  const meters = calculateDistanceInMeters(userLat, userLng, targetLat, targetLng);
  return formatDistance(meters);
}
