import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_MOBILE_COORDS } from '../utils/distance';

const LOCATION_CACHE_KEY = '@citylinks_cached_user_location';
const LOCATION_MODE_KEY = '@citylinks_location_mode';

export interface MobileLocationState {
  coords: { latitude: number; longitude: number };
  isLiveGPS: boolean;
  loading: boolean;
  locality: string;
  error: string | null;
  mode: 'live';
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
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>(DEFAULT_MOBILE_COORDS);
  const [isLiveGPS, setIsLiveGPS] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [locality, setLocality] = useState<string>('Detecting location...');
  const [error, setError] = useState<string | null>(null);

  const watcherSubRef = useRef<Location.LocationSubscription | null>(null);

  const reverseGeocodeLocality = async (latitude: number, longitude: number) => {
    try {
      const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geo) {
        let loc = geo.city || geo.subregion || geo.district || geo.street || 'Nearby';
        loc = loc.replace(/\s+division$/i, '').trim();
        setLocality(loc || 'Your Location');
      }
    } catch {
      setLocality('Your Location');
    }
  };

  const fetchLocation = useCallback(async (forceHighAccuracy = false) => {
    try {
      setLoading(true);
      setError(null);

      // Clean up any stale mode keys that previously forced Haveri Hub
      AsyncStorage.removeItem(LOCATION_MODE_KEY).catch(() => {});
      AsyncStorage.removeItem(LOCATION_CACHE_KEY).catch(() => {});

      // Check / request foreground location permission
      let perm = await Location.getForegroundPermissionsAsync().catch(() => null);
      if (!perm || perm.status !== 'granted') {
        perm = await Location.requestForegroundPermissionsAsync().catch(() => null);
      }

      if (!perm || perm.status !== 'granted') {
        setIsLiveGPS(false);
        setError('Location permission not granted. Please enable GPS permissions.');
        setLocality('GPS Disabled');
        setLoading(false);
        return;
      }

      // Step 1: Instant response using last known hardware position (< 10ms)
      if (!forceHighAccuracy) {
        try {
          const lastKnown = await Location.getLastKnownPositionAsync();
          if (lastKnown?.coords) {
            const { latitude, longitude } = lastKnown.coords;
            setCoords({ latitude, longitude });
            setIsLiveGPS(true);
            setLoading(false);
            reverseGeocodeLocality(latitude, longitude);
          }
        } catch {}
      }

      // Step 2: High-accuracy live position lookup directly from GPS hardware
      let currentPosition: Location.LocationObject | null = null;
      try {
        currentPosition = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
      } catch {
        // Fallback to balanced accuracy if indoor GPS satellite lock has a delay
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
        setCoords({ latitude, longitude });
        setIsLiveGPS(true);
        reverseGeocodeLocality(latitude, longitude);
      }
    } catch (err: any) {
      console.warn('GPS location lookup error:', err);
      setIsLiveGPS(false);
      setError(err?.message || 'Could not fetch device GPS location');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocation();

    // Start live location watcher for continuous 100% accurate distance updates
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync().catch(() => null);
        if (perm && perm.status === 'granted') {
          if (watcherSubRef.current) {
            watcherSubRef.current.remove();
          }
          watcherSubRef.current = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 4000,
              distanceInterval: 10,
            },
            (newPos) => {
              if (newPos?.coords) {
                const { latitude, longitude } = newPos.coords;
                setCoords({ latitude, longitude });
                setIsLiveGPS(true);
                setLoading(false);
              }
            }
          );
        }
      } catch (subErr) {
        console.warn('Location watcher error:', subErr);
      }
    })();

    return () => {
      if (watcherSubRef.current) {
        watcherSubRef.current.remove();
        watcherSubRef.current = null;
      }
    };
  }, [fetchLocation]);

  return {
    coords,
    isLiveGPS,
    loading,
    locality,
    error,
    mode: 'live',
    rawDeviceCoords: coords,
    rawDeviceLocality: locality,
    isOutsideHaveri: false,
    distanceFromHaveri: 0,
    refreshLocation: () => fetchLocation(true),
    switchToHaveri: () => {},
    switchToLiveGPS: () => fetchLocation(true),
    toggleMode: () => fetchLocation(true),
  };
}
