import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_MOBILE_COORDS, calculateDistanceInMeters } from '../utils/distance';

const LOCATION_CACHE_KEY = '@citylinks_cached_user_location';
const LOCATION_MODE_KEY = '@citylinks_location_mode';
const LOCATION_CACHE_TTL = 10 * 60 * 1000; // 10 minutes TTL

export interface MobileLocationState {
  coords: { latitude: number; longitude: number };
  isLiveGPS: boolean;
  loading: boolean;
  locality: string;
  error: string | null;
  mode: 'live' | 'haveri';
  rawDeviceCoords: { latitude: number; longitude: number } | null;
  rawDeviceLocality: string | null;
  isOutsideHaveri: boolean;
  distanceFromHaveri: number;
  refreshLocation: () => Promise<void>;
  switchToHaveri: () => void;
  switchToLiveGPS: () => Promise<void>;
  toggleMode: () => Promise<void>;
}

export function useUserLocation(): MobileLocationState {
  // By default, reference Haveri Town Center so local shop distances and nearest sorting are accurate
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>(DEFAULT_MOBILE_COORDS);
  const [isLiveGPS, setIsLiveGPS] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [locality, setLocality] = useState<string>('Haveri Town');
  const [mode, setMode] = useState<'live' | 'haveri'>('haveri');
  const [error, setError] = useState<string | null>(null);

  // Raw physical device readings
  const [rawDeviceCoords, setRawDeviceCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [rawDeviceLocality, setRawDeviceLocality] = useState<string | null>(null);
  const [isOutsideHaveri, setIsOutsideHaveri] = useState<boolean>(false);
  const [distanceFromHaveri, setDistanceFromHaveri] = useState<number>(0);

  const fetchLocation = useCallback(async (forceRefresh = false) => {
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
        setError('Location permission not granted. Defaulting to Haveri city center.');
        setCoords(DEFAULT_MOBILE_COORDS);
        setLocality('Haveri Town');
        setMode('haveri');
        setLoading(false);
        return;
      }

      // High-accuracy live position lookup directly from GPS hardware
      let currentPosition: Location.LocationObject | null = null;
      try {
        currentPosition = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
      } catch {
        // Fallback to balanced accuracy or last known position if indoor GPS satellite lock is unavailable
        try {
          currentPosition = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        } catch {
          try {
            currentPosition = await Location.getLastKnownPositionAsync();
          } catch {}
        }
      }

      if (currentPosition?.coords) {
        const { latitude, longitude } = currentPosition.coords;
        const distMeters = calculateDistanceInMeters(
          latitude,
          longitude,
          DEFAULT_MOBILE_COORDS.latitude,
          DEFAULT_MOBILE_COORDS.longitude
        );

        let detectedLocality = 'Nearby';
        try {
          const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (geo) {
            let loc = geo.city || geo.subregion || geo.district || geo.street || 'Nearby';
            loc = loc.replace(/\s+division$/i, '').trim();
            detectedLocality = loc || 'Nearby';
          }
        } catch {
          detectedLocality = 'Your Location';
        }

        setRawDeviceCoords({ latitude, longitude });
        setRawDeviceLocality(detectedLocality);
        setDistanceFromHaveri(distMeters);

        const isFar = distMeters > 35000; // > 35 km away from Haveri (e.g. Mysore, Bangalore, remote telecom tower)
        setIsOutsideHaveri(isFar);

        // Check if user has explicitly stored a preference
        const savedMode = await AsyncStorage.getItem(LOCATION_MODE_KEY).catch(() => null);

        if (savedMode === 'live' || (!isFar && savedMode !== 'haveri')) {
          // Device is physically in Haveri (< 35km) or user explicitly chose live GPS
          setCoords({ latitude, longitude });
          setLocality(detectedLocality || 'Haveri');
          setIsLiveGPS(true);
          setMode('live');
        } else {
          // Device is outside Haveri (e.g. Mysore, Bangalore, or remote telecom tower).
          // Default reference to Haveri Town Center so all local shops show accurate nearby distance (40m - 600m)!
          setCoords(DEFAULT_MOBILE_COORDS);
          setLocality('Haveri Town');
          setIsLiveGPS(false);
          setMode('haveri');
        }
      } else {
        setCoords(DEFAULT_MOBILE_COORDS);
        setLocality('Haveri Town');
        setIsLiveGPS(false);
        setMode('haveri');
      }
    } catch (err: any) {
      console.warn('GPS location lookup error:', err);
      setIsLiveGPS(false);
      setError(err?.message || 'Could not fetch device location');
      setCoords(DEFAULT_MOBILE_COORDS);
      setLocality('Haveri Town');
      setMode('haveri');
    } finally {
      setLoading(false);
    }
  }, []);

  const switchToHaveri = useCallback(() => {
    setCoords(DEFAULT_MOBILE_COORDS);
    setLocality('Haveri Town');
    setIsLiveGPS(false);
    setMode('haveri');
    AsyncStorage.setItem(LOCATION_MODE_KEY, 'haveri').catch(() => {});
  }, []);

  const switchToLiveGPS = useCallback(async () => {
    if (rawDeviceCoords) {
      setCoords(rawDeviceCoords);
      setLocality(rawDeviceLocality || 'Live GPS');
      setIsLiveGPS(true);
      setMode('live');
      AsyncStorage.setItem(LOCATION_MODE_KEY, 'live').catch(() => {});
    } else {
      AsyncStorage.setItem(LOCATION_MODE_KEY, 'live').catch(() => {});
      await fetchLocation(true);
    }
  }, [rawDeviceCoords, rawDeviceLocality, fetchLocation]);

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
    rawDeviceCoords,
    rawDeviceLocality,
    isOutsideHaveri,
    distanceFromHaveri,
    refreshLocation: () => fetchLocation(true),
    switchToHaveri,
    switchToLiveGPS,
    toggleMode,
  };
}
