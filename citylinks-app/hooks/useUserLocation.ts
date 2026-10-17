import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_MOBILE_COORDS } from '../utils/distance';

const LOCATION_CACHE_KEY = '@citylinks_cached_user_location';
const LOCATION_MODE_KEY = '@citylinks_location_mode';
const LOCATION_CACHE_TTL = 10 * 60 * 1000; // 10 minutes TTL

// Fast in-memory cached location object for immediate synchronous return
let memoryLocationCache: {
  coords: { latitude: number; longitude: number };
  locality: string;
  isLiveGPS: boolean;
  timestamp: number;
} | null = null;

let currentModeCache: 'live' | 'haveri' = 'live';

export interface MobileLocationState {
  coords: { latitude: number; longitude: number };
  isLiveGPS: boolean;
  loading: boolean;
  locality: string;
  error: string | null;
  mode: 'live' | 'haveri';
  refreshLocation: () => Promise<void>;
  switchToHaveri: () => void;
  switchToLiveGPS: () => Promise<void>;
  toggleMode: () => Promise<void>;
}

export function useUserLocation(): MobileLocationState {
  const [mode, setMode] = useState<'live' | 'haveri'>(currentModeCache);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>(
    currentModeCache === 'haveri'
      ? DEFAULT_MOBILE_COORDS
      : memoryLocationCache ? memoryLocationCache.coords : DEFAULT_MOBILE_COORDS
  );
  const [isLiveGPS, setIsLiveGPS] = useState<boolean>(
    currentModeCache === 'haveri'
      ? false
      : memoryLocationCache ? memoryLocationCache.isLiveGPS : false
  );
  const [loading, setLoading] = useState<boolean>(!memoryLocationCache && currentModeCache === 'live');
  const [locality, setLocality] = useState<string>(
    currentModeCache === 'haveri'
      ? 'Haveri'
      : memoryLocationCache ? memoryLocationCache.locality : 'Haveri'
  );
  const [error, setError] = useState<string | null>(null);

  // Initialize stored mode on mount
  useEffect(() => {
    AsyncStorage.getItem(LOCATION_MODE_KEY).then((savedMode) => {
      if (savedMode === 'haveri') {
        currentModeCache = 'haveri';
        setMode('haveri');
        setCoords(DEFAULT_MOBILE_COORDS);
        setLocality('Haveri');
        setIsLiveGPS(false);
        setLoading(false);
      }
    }).catch(() => {});
  }, []);

  const fetchLocation = useCallback(async (forceRefresh = false) => {
    // If user explicitly chose Haveri Center mode, do not poll device GPS
    if (!forceRefresh && currentModeCache === 'haveri') {
      setCoords(DEFAULT_MOBILE_COORDS);
      setLocality('Haveri');
      setIsLiveGPS(false);
      setLoading(false);
      return;
    }

    // If we have fresh in-memory cache and not forcing refresh, return immediately
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
      setLoading(true);
      setError(null);

      // Check / request foreground location permission
      let perm = await Location.getForegroundPermissionsAsync().catch(() => null);
      if (!perm || perm.status !== 'granted') {
        perm = await Location.requestForegroundPermissionsAsync().catch(() => null);
      }

      if (!perm || perm.status !== 'granted') {
        setIsLiveGPS(false);
        setError('Location permission not granted. Showing Haveri city center.');
        setCoords(DEFAULT_MOBILE_COORDS);
        setLocality('Haveri Center');
        setLoading(false);
        return;
      }

      // Check if hardware location services are enabled on the device
      const servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => true);
      if (!servicesEnabled) {
        setError('Device GPS is turned off. Please turn on Location in settings.');
      }

      // High-accuracy live position lookup directly from GPS hardware
      let currentPosition: Location.LocationObject | null = null;
      try {
        currentPosition = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
      } catch (highErr) {
        // Fall back to balanced accuracy or last known position if satellite lock is unavailable indoors
        try {
          currentPosition = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        } catch (balancedErr) {
          try {
            currentPosition = await Location.getLastKnownPositionAsync();
          } catch {}
        }
      }

      if (currentPosition?.coords) {
        const { latitude, longitude } = currentPosition.coords;
        setCoords({ latitude, longitude });
        setIsLiveGPS(true);

        // Reverse geocode to get clean locality name
        let detectedLocality = 'Haveri';
        try {
          const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (geo) {
            let loc = geo.city || geo.district || geo.subregion || geo.street || 'Nearby';
            // Strip administrative revenue suffixes like "Division"
            loc = loc.replace(/\s+division$/i, '').trim();
            detectedLocality = loc || 'Your Location';
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

  const switchToHaveri = useCallback(() => {
    currentModeCache = 'haveri';
    setMode('haveri');
    setCoords(DEFAULT_MOBILE_COORDS);
    setLocality('Haveri');
    setIsLiveGPS(false);
    AsyncStorage.setItem(LOCATION_MODE_KEY, 'haveri').catch(() => {});
  }, []);

  const switchToLiveGPS = useCallback(async () => {
    currentModeCache = 'live';
    setMode('live');
    memoryLocationCache = null;
    AsyncStorage.setItem(LOCATION_MODE_KEY, 'live').catch(() => {});
    await fetchLocation(true);
  }, [fetchLocation]);

  const toggleMode = useCallback(async () => {
    if (mode === 'live') {
      switchToHaveri();
    } else {
      await switchToLiveGPS();
    }
  }, [mode, switchToHaveri, switchToLiveGPS]);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return {
    coords,
    isLiveGPS,
    loading,
    locality,
    error,
    mode,
    refreshLocation: () => fetchLocation(true),
    switchToHaveri,
    switchToLiveGPS,
    toggleMode,
  };
}
