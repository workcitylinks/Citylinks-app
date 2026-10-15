import React, { useMemo, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Navigation, Crosshair, Compass } from 'lucide-react-native';

const WebViewComponent = WebView as any;

export interface LiveVehicleItem {
  id: string;
  name: string;
  vehicleType: string;
  categoryCode: string;
  phone: string;
  driverPlate: string;
  driverCar: string;
  rating: number;
  ratePerKm: number;
  baseFare: number;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  eta?: string;
  location?: string;
}

interface Coords {
  latitude: number;
  longitude: number;
}

interface RealLocationMapProps {
  pickupCoords: Coords | null;
  dropCoords: Coords | null;
  pickupAddress: string;
  dropAddress: string;
  liveVehicles?: LiveVehicleItem[];
  cityName?: string;
  step?: 'HOME' | 'DRIVER_ACCEPTED' | 'ONGOING_RIDE' | 'POST_TRIP';
  carProgress?: number;
  distanceKm?: number;
  onStabilize?: () => void;
  style?: any;
}

const DEFAULT_CENTER_LAT = 14.7968;
const DEFAULT_CENTER_LNG = 75.401;

export const RealLocationMap: React.FC<RealLocationMapProps> = ({
  pickupCoords,
  dropCoords,
  pickupAddress,
  dropAddress,
  liveVehicles = [],
  cityName = 'Current Location',
  step = 'HOME',
  carProgress = 0.3,
  distanceKm,
  onStabilize,
  style,
}) => {
  const webViewRef = useRef<WebView>(null);

  const pLat = pickupCoords?.latitude ?? DEFAULT_CENTER_LAT;
  const pLng = pickupCoords?.longitude ?? DEFAULT_CENTER_LNG;
  const hasDrop = !!dropCoords && !!dropAddress.trim();
  const dLat = dropCoords?.latitude ?? (pLat + 0.035);
  const dLng = dropCoords?.longitude ?? (pLng + 0.03);

  // Generate Leaflet HTML with real DB vehicles, Google Maps road tiles, and Map Stabilizer
  const mapHtml = useMemo(() => {
    // Fallback vehicles if none fetched yet
    const fallbackCars = [
      { id: '1', name: 'Karthik R.', driverCar: 'Toyota Corolla', driverPlate: 'KA 03 AB 1234', rating: 4.8, ratePerKm: 22, latitude: pLat + 0.005, longitude: pLng - 0.004, heading: 40, vehicleType: 'car' },
      { id: '2', name: 'Ramesh P.', driverCar: 'Maruti WagonR', driverPlate: 'KA 27 B 5678', rating: 4.7, ratePerKm: 18, latitude: pLat - 0.004, longitude: pLng + 0.003, heading: 135, vehicleType: 'car' },
      { id: '3', name: 'Suresh Kumar', driverCar: 'Toyota Innova', driverPlate: 'KA 04 CD 9012', rating: 4.9, ratePerKm: 28, latitude: pLat + 0.003, longitude: pLng + 0.005, heading: -30, vehicleType: 'car' },
      { id: '4', name: 'Manjunath H.', driverCar: 'Bajaj RE Auto', driverPlate: 'KA 27 E 3456', rating: 4.8, ratePerKm: 14, latitude: pLat - 0.003, longitude: pLng - 0.006, heading: 90, vehicleType: 'auto' },
      { id: '5', name: 'Anand S.', driverCar: 'Hero Splendor', driverPlate: 'KA 27 H 7890', rating: 4.9, ratePerKm: 8, latitude: pLat + 0.007, longitude: pLng + 0.002, heading: 175, vehicleType: 'bike' },
    ];

    const activeVehicles = liveVehicles.length > 0 ? liveVehicles : fallbackCars;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { box-sizing: border-box; }
          body, html, #map {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background: #ffffff;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .custom-div-icon {
            background: transparent;
            border: none;
          }

          /* User Radar Pulsing Pin (Pickup A) - CityLinks Signature Blue Theme */
          .pickup-pin-container {
            width: 60px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          }
          .pickup-pulse-radar {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            background: rgba(37, 99, 235, 0.22);
            border: 1.5px solid rgba(37, 99, 235, 0.6);
            position: absolute;
            animation: pulseRadar 2.2s infinite ease-out;
          }
          .pickup-blue-dot {
            width: 24px;
            height: 24px;
            border-radius: 12px;
            background: #2563eb;
            border: 3.5px solid #ffffff;
            box-shadow: 0 3px 8px rgba(37, 99, 235, 0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 11px;
            font-weight: 900;
            z-index: 10;
          }
          @keyframes pulseRadar {
            0% { transform: scale(0.6); opacity: 0.9; }
            100% { transform: scale(1.4); opacity: 0; }
          }

          /* Destination Pin (Drop B) */
          .drop-pin-container {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .drop-pin {
            width: 28px;
            height: 28px;
            border-radius: 14px;
            background: #ef4444;
            color: #ffffff;
            font-size: 13px;
            font-weight: 900;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2.5px solid #ffffff;
            box-shadow: 0 3px 8px rgba(239, 68, 68, 0.45);
          }
          .drop-pin-stem {
            width: 3px;
            height: 6px;
            background: #ef4444;
            border-radius: 1px;
          }

          /* Driver Vehicle Popup Tooltip */
          .leaflet-popup-content-wrapper {
            border-radius: 14px;
            padding: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.18);
            border: 1px solid #dbeafe;
          }
          .leaflet-popup-content {
            margin: 8px 10px;
            line-height: 1.4;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>

        <script>
          // Initialize map centered at real user GPS
          var map = L.map('map', {
            zoomControl: false,
            attributionControl: false
          }).setView([${pLat}, ${pLng}], 15);

          // Google Maps Official Road Daytime Tiles
          L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
          }).addTo(map);

          // Helper: Top-down Car SVG
          function getCarSvg(rot) {
            return '<div style="transform: rotate(' + rot + 'deg); width: 26px; height: 44px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.35)); cursor: pointer;">' +
              '<svg width="24" height="42" viewBox="0 0 24 42" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                '<rect x="2" y="1" width="20" height="40" rx="6" fill="#f8fafc" stroke="#2563eb" stroke-width="1.2"/>' +
                '<path d="M4.5 10 C4.5 8.5 19.5 8.5 19.5 10 L18 16 C18 17 6 17 6 16 Z" fill="#0f172a"/>' +
                '<rect x="6" y="15" width="12" height="12" rx="2" fill="#1d4ed8"/>' +
                '<path d="M6 29 C6 28 18 28 18 29 L17.5 33.5 C17.5 34 6.5 34 6.5 33.5 Z" fill="#0f172a"/>' +
                '<rect x="3.5" y="1.5" width="3.5" height="2" rx="0.5" fill="#fef08a"/>' +
                '<rect x="17" y="1.5" width="3.5" height="2" rx="0.5" fill="#fef08a"/>' +
                '<rect x="3.5" y="38.5" width="3.5" height="1.8" rx="0.5" fill="#ef4444"/>' +
                '<rect x="17" y="38.5" width="3.5" height="1.8" rx="0.5" fill="#ef4444"/>' +
              '</svg>' +
            '</div>';
          }

          // Helper: Auto Rickshaw SVG
          function getAutoSvg(rot) {
            return '<div style="transform: rotate(' + rot + 'deg); width: 24px; height: 36px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.35)); cursor: pointer;">' +
              '<svg width="22" height="34" viewBox="0 0 22 34" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                '<rect x="2" y="1" width="18" height="32" rx="5" fill="#15803d" stroke="#2563eb" stroke-width="1.2"/>' +
                '<rect x="4" y="8" width="14" height="16" rx="2.5" fill="#eab308"/>' +
                '<path d="M4 3.5 C4 2 18 2 18 3.5 L17 7 L5 7 Z" fill="#0f172a"/>' +
                '<rect x="3" y="31" width="3" height="1.5" rx="0.5" fill="#ef4444"/>' +
                '<rect x="16" y="31" width="3" height="1.5" rx="0.5" fill="#ef4444"/>' +
              '</svg>' +
            '</div>';
          }

          // Helper: Bike SVG
          function getBikeSvg(rot) {
            return '<div style="transform: rotate(' + rot + 'deg); width: 20px; height: 36px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); cursor: pointer;">' +
              '<svg width="18" height="34" viewBox="0 0 18 34" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                '<rect x="7" y="2" width="4" height="10" rx="2" fill="#0f172a"/>' +
                '<rect x="5" y="12" width="8" height="14" rx="3" fill="#2563eb"/>' +
                '<rect x="7" y="26" width="4" height="6" rx="2" fill="#0f172a"/>' +
                '<line x1="2" y1="14" x2="16" y2="14" stroke="#0f172a" stroke-width="2.5"/>' +
              '</svg>' +
            '</div>';
          }

          // 1. User Pickup Marker (A) with Blue Radar
          var pickupIcon = L.divIcon({
            className: 'custom-div-icon',
            html: '<div class="pickup-pin-container"><div class="pickup-pulse-radar"></div><div class="pickup-blue-dot">A</div></div>',
            iconSize: [60, 60],
            iconAnchor: [30, 30]
          });
          L.marker([${pLat}, ${pLng}], { icon: pickupIcon }).addTo(map);

          // 2. Real-time Vehicles from Database
          var dbVehicles = ${JSON.stringify(activeVehicles)};
          dbVehicles.forEach(function(v) {
            var rot = v.heading || 45;
            var isAuto = (v.vehicleType || '').toLowerCase().includes('auto') || (v.categoryCode || '') === 'auto';
            var isBike = (v.vehicleType || '').toLowerCase().includes('bike') || (v.categoryCode || '') === 'bike';
            
            var iconHtml = isAuto ? getAutoSvg(rot) : (isBike ? getBikeSvg(rot) : getCarSvg(rot));
            var vIcon = L.divIcon({
              className: 'custom-div-icon',
              html: iconHtml,
              iconSize: [26, 44],
              iconAnchor: [13, 22]
            });

            var marker = L.marker([v.latitude, v.longitude], { icon: vIcon }).addTo(map);

            // Rich interactive tooltip with driver details from DB
            var popupContent = '<div style="font-family:sans-serif; min-width:145px; padding:2px;">' +
              '<div style="font-weight:800; color:#0f172a; font-size:13px;">' + (v.name || 'Driver') + '</div>' +
              '<div style="color:#2563eb; font-weight:700; font-size:11px; margin-top:2px;">' + (v.driverCar || 'Vehicle') + '</div>' +
              '<div style="color:#64748b; font-size:10px;">' + (v.driverPlate || 'KA 27 M 4589') + '</div>' +
              (v.location ? '<div style="color:#334155; font-size:10px; margin-top:2px; font-weight:600;">📍 ' + v.location + '</div>' : '') +
              '<div style="margin-top:6px; display:flex; justify-content:space-between; align-items:center; gap:6px;">' +
                '<span style="color:#1d4ed8; background:#eff6ff; padding:2px 6px; border-radius:6px; border:1px solid #bfdbfe; font-size:11px; font-weight:800;">₹' + (v.ratePerKm || 20) + '/km</span>' +
                '<a href="https://www.google.com/maps/dir/?api=1&destination=' + v.latitude + ',' + v.longitude + '" target="_blank" style="color:#2563eb; font-size:10px; font-weight:800; text-decoration:none; background:#f1f5f9; padding:2px 6px; border-radius:6px;">Track ↗</a>' +
              '</div>' +
            '</div>';

            marker.bindPopup(popupContent);
          });

          // 3. Drop Point & Real Navigation Route (When user enters destination)
          ${hasDrop ? `
            var dropIcon = L.divIcon({
              className: 'custom-div-icon',
              html: '<div class="drop-pin-container"><div class="drop-pin">B</div><div class="drop-pin-stem"></div></div>',
              iconSize: [28, 34],
              iconAnchor: [14, 34]
            });
            L.marker([${dLat}, ${dLng}], { icon: dropIcon }).addTo(map);

            function drawRoute(coordsList) {
              // Outer border / glow line (Navy blue)
              L.polyline(coordsList, {
                color: '#1d4ed8',
                weight: 7,
                opacity: 0.45,
                lineCap: 'round',
                lineJoin: 'round'
              }).addTo(map);

              // Inner vibrant navigation line (CityLinks Royal Blue)
              L.polyline(coordsList, {
                color: '#2563eb',
                weight: 4.5,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round'
              }).addTo(map);

              // Fit map bounds to encompass pickup and drop
              map.fitBounds(coordsList, { padding: [45, 45], maxZoom: 16 });
            }

            // Default fallback curved route coordinates
            var fallbackCoords = [
              [${pLat}, ${pLng}],
              [${pLat + (dLat - pLat) * 0.3}, ${pLng + (dLng - pLng) * 0.1}],
              [${pLat + (dLat - pLat) * 0.65}, ${pLng + (dLng - pLng) * 0.75}],
              [${dLat}, ${dLng}]
            ];

            // OSRM road geometry
            var osrmUrl = 'https://router.project-osrm.org/route/v1/driving/${pLng},${pLat};${dLng},${dLat}?overview=full&geometries=geojson';
            fetch(osrmUrl)
              .then(function(r) { return r.json(); })
              .then(function(data) {
                if (data && data.routes && data.routes.length > 0 && data.routes[0].geometry) {
                  var coordinates = data.routes[0].geometry.coordinates.map(function(c) {
                    return [c[1], c[0]];
                  });
                  drawRoute(coordinates);
                } else {
                  drawRoute(fallbackCoords);
                }
              })
              .catch(function(err) {
                drawRoute(fallbackCoords);
              });
          ` : ''}

          // MAP STABILIZER FUNCTION: Smoothly flies back and stabilizes the view
          function stabilizeMap() {
            ${hasDrop ? `
              map.flyToBounds([[${pLat}, ${pLng}], [${dLat}, ${dLng}]], {
                padding: [45, 45],
                maxZoom: 16,
                animate: true,
                duration: 1.0
              });
            ` : `
              map.flyTo([${pLat}, ${pLng}], 16, {
                animate: true,
                duration: 1.0
              });
            `}
          }
          window.stabilizeMap = stabilizeMap;
          window.recenterMap = stabilizeMap;
        </script>
      </body>
      </html>
    `;
  }, [pLat, pLng, dLat, dLng, hasDrop, cityName, liveVehicles]);

  // Trigger Map Stabilizer
  const handleStabilizeClick = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript('if(window.stabilizeMap) window.stabilizeMap(); true;');
    }
    if (onStabilize) onStabilize();
  };

  return (
    <View style={[styles.container, style]}>
      <WebViewComponent
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        style={styles.webView}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={styles.loadingText}>Loading Map Navigation...</Text>
          </View>
        )}
      />

      {/* MAP STABILIZER FLOATING BUTTON (White & Blue Theme) */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleStabilizeClick}
        style={styles.floatingStabilizerBtn}
        accessibilityLabel="Stabilize map to current location"
      >
        <View style={styles.stabilizerInnerRow}>
          <View style={styles.stabilizerIconCircle}>
            <Navigation size={18} color="#2563eb" style={{ transform: [{ rotate: '45deg' }] }} />
          </View>
          <Text style={styles.stabilizerBtnText}>Stabilize</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
    backgroundColor: '#ffffff',
    position: 'relative',
    overflow: 'hidden',
  },
  webView: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 6,
  },
  // Floating Map Stabilizer Button (White Card + Blue Brand Accent)
  floatingStabilizerBtn: {
    position: 'absolute',
    right: 14,
    bottom: 24,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 25,
    borderWidth: 1.5,
    borderColor: '#dbeafe',
  },
  stabilizerInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stabilizerIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stabilizerBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1d4ed8',
  },
});
