import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_MOBILE_COORDS } from '../utils/distance';

const LOCATION_CACHE_KEY = '@citylinks_cached_user_location';
const LOCATION_CACHE_TTL = 15 * 60 * 1000; // 15 minutes TTL

// Fast in-memory cached location object for immediate synchronous return
let memoryLocationCache: {
  coords: { latitude: number; longitude: number };
  locality: string;
  isLiveGPS: boolean;
  timestamp: number;
} | null = null;

export interface MobileLocationState {
  coords: { latitude: number; longitude: number };
  isLiveGPS: boolean;
  loading: boolean;
  locality: string;
  error: string | null;
  refreshLocation: () => Promise<void>;
}

export function useUserLocation(): MobileLocationState {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>(
    memoryLocationCache ? memoryLocationCache.coords : DEFAULT_MOBILE_COORDS
  );
  const [isLiveGPS, setIsLiveGPS] = useState<boolean>(
    memoryLocationCache ? memoryLocationCache.isLiveGPS : false
  );
  const [loading, setLoading] = useState<boolean>(!memoryLocationCache);
  const [locality, setLocality] = useState<string>(
    memoryLocationCache ? memoryLocationCache.locality : 'Haveri'
  );
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = useCallback(async (forceRefresh = false) => {
    // If we already have fresh in-memory cache, skip loading to avoid lag
    if (
      !forceRefresh &&
      memoryLocationCache &&
      Date.now() - memoryLocationCache.timestamp < LOCATION_CACHE_TTL
    ) {
      setCoords(memoryLocationCache.coords);
      setLocality(memoryLocationCache.locality);
      setIsLiveGPS(memoryLocationCache.isLiveGPS);
      setLoading(false);
      return;
    }

    try {
      // Warm up from persistent storage immediately if available
      if (!memoryLocationCache) {
        try {
          const stored = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.coords && Date.now() - parsed.timestamp < LOCATION_CACHE_TTL) {
              memoryLocationCache = parsed;
              setCoords(parsed.coords);
              setLocality(parsed.locality);
              setIsLiveGPS(parsed.isLiveGPS);
              setLoading(false);
              return;
            }
          }
        } catch {}
      }

      setLoading(true);
      setError(null);

      // Check / request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setIsLiveGPS(false);
        setError('Location permission not granted. Showing Haveri city center.');
        setCoords(DEFAULT_MOBILE_COORDS);
        setLocality('Haveri Center');
        setLoading(false);
        return;
      }

      // Fast lookup: first check last known position for near-instant rendering
      let currentPosition: Location.LocationObject | null = null;
      try {
        currentPosition = await Location.getLastKnownPositionAsync();
      } catch {}

      // If no last known or expired, do balanced accuracy lookup
      if (!currentPosition) {
        try {
          currentPosition = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        } catch (locErr) {
          console.warn('GPS position timeout:', locErr);
        }
      }

      if (currentPosition?.coords) {
        const { latitude, longitude } = currentPosition.coords;
        setCoords({ latitude, longitude });
        setIsLiveGPS(true);

        // Reverse geocode to get human-readable locality
        let detectedLocality = 'Haveri';
        try {
          const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (geo) {
            detectedLocality =
              geo.district || geo.subregion || geo.city || geo.street || 'Nearby';
          }
        } catch {
          detectedLocality = 'Your Location';
        }
        setLocality(detectedLocality);

        // Cache in memory and AsyncStorage
        const cacheObj = {
          coords: { latitude, longitude },
          locality: detectedLocality,
          isLiveGPS: true,
          timestamp: Date.now(),
        };
        memoryLocationCache = cacheObj;
        AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cacheObj)).catch(() => {});
      } else {
        setIsLiveGPS(false);
        setCoords(DEFAULT_MOBILE_COORDS);
        setLocality('Haveri Center');
      }
    } catch (err: any) {
      console.warn('GPS location lookup error:', err);
      setIsLiveGPS(false);
      setError(err?.message || 'Could not fetch device location');
      setCoords(DEFAULT_MOBILE_COORDS);
      setLocality('Haveri Center');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return {
    coords,
    isLiveGPS,
    loading,
    locality,
    error,
    refreshLocation: () => fetchLocation(true),
  };
}
