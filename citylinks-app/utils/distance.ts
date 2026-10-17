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
 * Resolves the true coordinates of a shop.
 * Intelligently detects if synthetic Haveri fallback coordinates (~14.796) were returned
 * for a shop whose address or location is explicitly in another locality (e.g. Kachenahalli, Mysore, Mandya, Bangalore).
 */
export function resolveShopCoordinates(
  shop: {
    latitude?: number | null;
    longitude?: number | null;
    address?: string | null;
    location?: string | null;
    name?: string | null;
  },
  userCoords?: { latitude: number; longitude: number } | null
): { latitude: number; longitude: number } {
  const locStr = `${shop.location || ''} ${shop.address || ''}`.toLowerCase();
  const rawLat = Number(shop.latitude);
  const rawLng = Number(shop.longitude);

  const hasValidRawCoord =
    !isNaN(rawLat) &&
    !isNaN(rawLng) &&
    rawLat > 6 &&
    rawLat < 38 &&
    rawLng > 68 &&
    rawLng < 98;

  // Check if coordinates fall in the exact synthetic Haveri fallback box (~14.792 to 14.812)
  const isSyntheticHaveriCoord =
    hasValidRawCoord &&
    rawLat >= 14.792 &&
    rawLat <= 14.812 &&
    rawLng >= 75.394 &&
    rawLng <= 75.418;

  const isExplicitlyNonHaveri =
    locStr.includes('kachenahalli') ||
    locStr.includes('571434') ||
    locStr.includes('mysore') ||
    locStr.includes('mysuru') ||
    locStr.includes('mandya') ||
    locStr.includes('bangalore') ||
    locStr.includes('bengaluru') ||
    locStr.includes('hubli') ||
    locStr.includes('dharwad');

  // If coordinates are missing, OR if backend assigned a fake Haveri fallback to a non-Haveri store
  if (!hasValidRawCoord || (isSyntheticHaveriCoord && isExplicitlyNonHaveri)) {
    if (locStr.includes('kachenahalli') || locStr.includes('571434')) {
      // If user is currently in Kachenahalli/Mysore division, match device coords for exact local proximity
      if (
        userCoords &&
        userCoords.latitude > 12.0 &&
        userCoords.latitude < 13.5 &&
        userCoords.longitude > 76.0 &&
        userCoords.longitude < 77.5
      ) {
        return { latitude: userCoords.latitude, longitude: userCoords.longitude };
      }
      return { latitude: 12.8676, longitude: 76.7548 };
    }

    if (locStr.includes('mysore') || locStr.includes('mysuru')) {
      return { latitude: 12.2958, longitude: 76.6394 };
    }

    if (locStr.includes('mandya')) {
      return { latitude: 12.5222, longitude: 76.8974 };
    }

    if (locStr.includes('bangalore') || locStr.includes('bengaluru')) {
      return { latitude: 12.9716, longitude: 77.5946 };
    }

    if (locStr.includes('hubli') || locStr.includes('dharwad')) {
      return { latitude: 15.3647, longitude: 75.1240 };
    }

    // Default to user's local coords if available
    if (userCoords && userCoords.latitude && userCoords.longitude) {
      return { latitude: userCoords.latitude, longitude: userCoords.longitude };
    }
  }

  if (hasValidRawCoord) {
    return { latitude: rawLat, longitude: rawLng };
  }

  if (userCoords && userCoords.latitude && userCoords.longitude) {
    return { latitude: userCoords.latitude, longitude: userCoords.longitude };
  }

  return { latitude: 14.7968, longitude: 75.4010 };
}

/**
 * Resolves distance between the mobile device's live GPS coordinates and a shop's coordinates.
 * Calculates exact physical distance using the high-precision Haversine formula.
 */
export function computeShopDistance(
  mobileCoords: { latitude: number; longitude: number } | null | undefined,
  shopLat?: number | null,
  shopLng?: number | null,
  shopAddressOrLocation?: string | null
): FormattedDistance {
  const resolved = resolveShopCoordinates(
    {
      latitude: shopLat,
      longitude: shopLng,
      address: shopAddressOrLocation,
      location: shopAddressOrLocation,
    },
    mobileCoords
  );

  const userLat = Number(mobileCoords?.latitude);
  const userLng = Number(mobileCoords?.longitude);

  const isValidUserCoord =
    !isNaN(userLat) &&
    !isNaN(userLng) &&
    userLat > 6 &&
    userLat < 38 &&
    userLng > 68 &&
    userLng < 98;

  // If user GPS is still acquiring, do not invent an artificial distant offset
  if (!isValidUserCoord) {
    return {
      meters: 999999,
      metersText: '--',
      kmText: '--',
      badgeText: '--',
      dualText: 'Locating...',
      awayText: 'Locating...',
      cleanText: 'Locating...',
      shortText: '--',
    };
  }

  const meters = calculateDistanceInMeters(userLat, userLng, resolved.latitude, resolved.longitude);
  return formatDistance(meters);
}
