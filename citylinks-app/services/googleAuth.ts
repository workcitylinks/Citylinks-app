import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/apiClient';
import { registerForPushNotificationsAsync } from './pushNotifications';
import { getParticularLoggedPage } from '../utils/authRedirect';

WebBrowser.maybeCompleteAuthSession();

export interface GoogleAuthResult {
  success: boolean;
  user?: any;
  token?: string;
  targetRoute?: string;
  isProfileComplete?: boolean;
  error?: string;
}

/**
 * Automatically detects the user's location & address from their mobile network / GPS
 * and syncs it with the backend database.
 */
export async function tryAutoDetectAndSaveAddress(token: string): Promise<string | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    let position = await Location.getLastKnownPositionAsync();
    if (!position) {
      position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    }

    if (position?.coords) {
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      if (geo) {
        const parts = [
          geo.name || geo.streetNumber,
          geo.street,
          geo.district || geo.subregion,
          geo.city,
          geo.region || 'Karnataka',
          geo.postalCode,
        ].filter(Boolean);

        const fullAddress = parts.join(', ');
        if (fullAddress) {
          // Sync with backend profile
          apiClient
            .put(
              '/auth/profile',
              { address: fullAddress },
              { headers: { Authorization: `Bearer ${token}` } }
            )
            .then((res) => {
              if (res.data?.user) {
                AsyncStorage.setItem('user_data', JSON.stringify(res.data.user)).catch(() => {});
              }
            })
            .catch(() => {});

          return fullAddress;
        }
      }
    }
  } catch (locErr) {
    console.warn('[GoogleAuth] Auto-address detection error:', locErr);
  }
  return null;
}

/**
 * Initiates the authentic Google Sign-In flow:
 * 1. Opens the in-app browser OAuth session (Google "Choose an account" screen)
 * 2. Intercepts deep link redirect automatically across both WebBrowser & Linking listeners
 * 3. Deep links back to the app, closes browser, and stores session
 * 4. Auto-detects device address from mobile network / GPS
 * 5. Routes user directly to their particular dashboard
 */
export async function startGoogleOAuthFlow(
  redirectParam?: string | string[] | null
): Promise<GoogleAuthResult> {
  let linkSubscription: any = null;

  try {
    // 1. Build deep link redirect URI for this mobile device (targets active 'auth' route to eliminate 404 unmatched screens)
    const clientRedirectUri = Linking.createURL('auth');

    // 2. Build backend Google OAuth start URL
    const baseUrl = apiClient.defaults.baseURL || 'http://192.168.0.108:5001/api';
    const startUrl = `${baseUrl}/auth/google/start?redirect_uri=${encodeURIComponent(clientRedirectUri)}`;

    // Set up dual-channel promise (resolves via openAuthSessionAsync OR via system deep-link event)
    const authPromise = new Promise<string>((resolve) => {
      // Channel A: System Intent Listener
      linkSubscription = Linking.addEventListener('url', (event) => {
        if (event.url && (event.url.includes('token=') || event.url.includes('error='))) {
          try {
            WebBrowser.dismissAuthSession();
          } catch {}
          resolve(event.url);
        }
      });

      // Channel B: WebBrowser In-App Session
      WebBrowser.openAuthSessionAsync(startUrl, clientRedirectUri)
        .then((result) => {
          if (result.type === 'success' && result.url) {
            resolve(result.url);
          } else if (result.type === 'cancel' || result.type === 'dismiss') {
            resolve('CANCELLED');
          }
        })
        .catch(() => {});
    });

    const returnedUrl = await authPromise;

    if (linkSubscription && typeof linkSubscription.remove === 'function') {
      linkSubscription.remove();
    }

    if (returnedUrl === 'CANCELLED') {
      return {
        success: false,
        error: 'Google sign-in was cancelled',
      };
    }

    if (returnedUrl && returnedUrl.includes('token=')) {
      const parsed = Linking.parse(returnedUrl);
      const query = parsed.queryParams || {};

      if (query.error) {
        return {
          success: false,
          error: String(query.error),
        };
      }

      const token = query.token as string;
      const userRaw = query.user as string;
      const isProfileComplete = query.isProfileComplete === 'true';

      if (token && userRaw) {
        let user: any;
        try {
          user = typeof userRaw === 'string' ? JSON.parse(decodeURIComponent(userRaw)) : userRaw;
        } catch {
          user = userRaw;
        }

        // Store credentials
        await AsyncStorage.setItem('user_token', token);
        await AsyncStorage.setItem('user_data', JSON.stringify(user));

        // Sync push notification token
        registerForPushNotificationsAsync().catch(() => {});

        // Auto-detect mobile network / GPS address in background
        if (!user.address) {
          tryAutoDetectAndSaveAddress(token).catch(() => {});
        }

        // Compute particular target route
        const targetRoute = getParticularLoggedPage(user, redirectParam);

        return {
          success: true,
          user,
          token,
          targetRoute,
          isProfileComplete,
        };
      }
    }

    return {
      success: false,
      error: 'Google authentication was not completed',
    };
  } catch (err: any) {
    if (linkSubscription && typeof linkSubscription.remove === 'function') {
      linkSubscription.remove();
    }
    console.error('⚠️ [GoogleAuth] Error during OAuth session:', err);
    return {
      success: false,
      error: err.message || 'Failed to complete Google authentication',
    };
  }
}
