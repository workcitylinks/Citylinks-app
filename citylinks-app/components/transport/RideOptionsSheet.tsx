import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import {
  Navigation,
  Car,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  Clock,
  MapPin,
  ExternalLink,
} from 'lucide-react-native';

export interface RouteOption {
  id: string;
  name: string;
  via: string;
  distanceKm: number;
  durationMin: number;
  traffic: string;
  isRecommended?: boolean;
}

export interface NearbyDriverItem {
  id: string;
  name: string;
  driverCar: string;
  driverPlate: string;
  vehicleType: string;
  categoryCode?: string;
  ratePerKm: number;
  baseFare: number;
  rating?: number;
  phone: string;
  eta?: string;
  distanceFromUserKm?: number;
  totalFare?: number;
  formula?: string;
  image?: any;
  location?: string;
  latitude?: number;
  longitude?: number;
}

// Backward compatibility interface for generic ride item if needed
export interface RideChoiceItem {
  id: string;
  name: string;
  eta: string;
  seats: number;
  image: any;
  fare?: string;
  ratePerKm?: number;
  baseFare?: number;
  totalFare?: number;
  formula?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
}

interface RideOptionsSheetProps {
  drivers?: NearbyDriverItem[];
  selectedDriverId?: string;
  onSelectDriver: (driver: NearbyDriverItem) => void;
  // Also support legacy rides prop if provided
  rides?: RideChoiceItem[];
  selectedRideId?: string;
  onSelectRide?: (id: string) => void;
  distanceKm?: number;
  routes?: RouteOption[];
  selectedRouteId?: string;
  onSelectRoute?: (routeId: string) => void;
  onActionPress?: (actionName: string) => void;
  onTrackGoogleMaps?: (driver: NearbyDriverItem) => void;
}

export const RideOptionsSheet: React.FC<RideOptionsSheetProps> = ({
  drivers = [],
  selectedDriverId,
  onSelectDriver,
  rides = [],
  selectedRideId,
  onSelectRide,
  distanceKm = 1.0,
  routes = [],
  selectedRouteId = 'fastest',
  onSelectRoute,
  onActionPress,
  onTrackGoogleMaps,
}) => {
  // Normalize drivers list: if drivers provided, use them; otherwise map rides to drivers
  const activeDriverList: NearbyDriverItem[] =
    drivers.length > 0
      ? drivers
      : rides.map((r) => ({
          id: r.id,
          name: `${r.name} Driver`,
          driverCar: r.name === 'Auto' ? 'Bajaj RE Auto Rickshaw' : `${r.name} Sedan`,
          driverPlate: 'KA 27 M 4589',
          vehicleType: r.name,
          categoryCode: r.id,
          ratePerKm: r.ratePerKm || 20,
          baseFare: r.baseFare || 30,
          rating: 4.8,
          phone: '9876543210',
          eta: r.eta,
          totalFare: r.totalFare,
          formula: r.formula,
          image: r.image,
        }));

  return (
    <View style={styles.container}>
      {/* 1. ROUTES & DISTANCE BANNER (WHITE & BLUE THEME) */}
      {distanceKm > 0 && (
        <View style={styles.routeHeaderCard}>
          <View style={styles.routeSummaryRow}>
            <View style={styles.distanceBadge}>
              <Navigation size={13} color="#2563eb" />
              <Text style={styles.distanceText}>{distanceKm} km</Text>
            </View>
            <Text style={styles.routeHintText}>
              Driver-fixed rates: <Text style={{ fontWeight: '800', color: '#1d4ed8' }}>Rate/KM + Base Price</Text>
            </Text>
          </View>

          {/* Possible Routes Selector */}
          {routes.length > 0 && (
            <View style={styles.routesListRow}>
              {routes.map((rt) => {
                const isRtActive = (selectedRouteId || 'fastest') === rt.id;
                return (
                  <TouchableOpacity
                    key={rt.id}
                    activeOpacity={0.8}
                    onPress={() => onSelectRoute?.(rt.id)}
                    style={[
                      styles.routeChoicePill,
                      isRtActive ? styles.routeChoicePillActive : styles.routeChoicePillInactive,
                    ]}
                  >
                    <View style={styles.routeDotRow}>
                      <View
                        style={[
                          styles.routeDot,
                          { backgroundColor: isRtActive ? '#2563eb' : '#94a3b8' },
                        ]}
                      />
                      <Text style={[styles.routeName, isRtActive && styles.routeNameActive]}>
                        {rt.name} ({rt.distanceKm} km)
                      </Text>
                    </View>
                    <Text style={styles.routeViaText} numberOfLines={1}>
                      {rt.via} • {rt.durationMin}m ({rt.traffic})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* 2. SECTION HEADER: NEARBY DRIVERS & COUNT */}
      <View style={styles.headerRow}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.title}>Nearby Drivers</Text>
            <View style={styles.driverCountBadge}>
              <Text style={styles.driverCountBadgeText}>{activeDriverList.length} Online</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Tap a driver to view vehicle & start ride
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onActionPress?.('prices')}
          style={styles.formulaPill}
        >
          <ShieldCheck size={13} color="#2563eb" />
          <Text style={styles.formulaPillText}>Rate/KM Info</Text>
        </TouchableOpacity>
      </View>

      {/* 3. VERTICAL LIST OF NEARBY DRIVERS WITH THEIR PRICE PER KM */}
      <View style={styles.driversListContainer}>
        {activeDriverList.map((driver) => {
          const isSelected = selectedDriverId === driver.id;
          const computedFare =
            driver.totalFare ||
            Math.round(distanceKm * (driver.ratePerKm || 20) + (driver.baseFare || 30));

          return (
            <TouchableOpacity
              key={driver.id}
              activeOpacity={0.85}
              onPress={() => onSelectDriver(driver)}
              style={[
                styles.driverCard,
                isSelected ? styles.driverCardActive : styles.driverCardInactive,
              ]}
              accessibilityLabel={`Select driver ${driver.name} at rupees ${driver.ratePerKm} per km`}
            >
              {/* Left Column: Avatar & Online Status */}
              <View style={styles.driverAvatarCol}>
                <Image
                  source={
                    driver.image || require('../../assets/images/rides/ride_driver.jpg')
                  }
                  style={styles.driverAvatar}
                />
                <View style={styles.onlineDotBadge}>
                  <View style={styles.onlineInnerDot} />
                </View>
              </View>

              {/* Middle Column: Driver Name, Vehicle, Number Plate & ETA */}
              <View style={styles.driverInfoCol}>
                <View style={styles.nameHeaderRow}>
                  <Text style={styles.driverName} numberOfLines={1}>
                    {driver.name}
                  </Text>
                  <CheckCircle size={14} color="#2563eb" style={{ marginLeft: 3 }} />
                </View>

                {/* Vehicle Model */}
                <Text style={styles.vehicleModelText} numberOfLines={1}>
                  {driver.driverCar}
                </Text>

                {/* Vehicle Type & Number Plate Badges */}
                <View style={styles.tagsRow}>
                  {driver.vehicleType ? (
                    <View style={styles.vehTypeBadge}>
                      <Text style={styles.vehTypeBadgeText}>{driver.vehicleType}</Text>
                    </View>
                  ) : null}

                  {/* Commercial Yellow Number Plate */}
                  <View style={styles.plateBadge}>
                    <View style={styles.plateIndBadge}>
                      <Text style={styles.plateIndText}>IND</Text>
                    </View>
                    <Text style={styles.plateBadgeText}>{driver.driverPlate}</Text>
                  </View>
                </View>

                {/* Driver Location & ETA */}
                <View style={styles.driverLocationRow}>
                  <MapPin size={11} color="#2563eb" />
                  <Text style={styles.driverLocationText} numberOfLines={1}>
                    {driver.location || 'Ashwini Nagar, Haveri'}
                  </Text>
                </View>

                <View style={styles.etaRow}>
                  <Clock size={11} color="#2563eb" />
                  <Text style={styles.etaText}>
                    {driver.eta || '2–5 min away'}
                  </Text>
                </View>

                {/* Google Maps Track Connection */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onTrackGoogleMaps?.(driver);
                  }}
                  style={styles.googleMapsTrackBtn}
                  accessibilityLabel={`Track ${driver.name} in Google Maps`}
                >
                  <Navigation size={10} color="#1d4ed8" />
                  <Text style={styles.googleMapsTrackBtnText}>Track in Google Maps</Text>
                </TouchableOpacity>
              </View>

              {/* Right Column: Prominent Rate Per KM & Base Price */}
              <View style={styles.priceCol}>
                <View style={styles.ratePerKmBadge}>
                  <Text style={styles.ratePerKmText}>
                    ₹{driver.ratePerKm}/km
                  </Text>
                </View>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', marginTop: 2, marginBottom: 4 }}>
                  Base: ₹{driver.baseFare || 30}
                </Text>

                {/* Action button */}
                <View style={styles.selectBtnPill}>
                  <Text style={styles.selectBtnPillText}>Select</Text>
                  <ChevronRight size={13} color="#ffffff" />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  // Route Header Card (White & Blue)
  routeHeaderCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  routeSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  routeHintText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  routesListRow: {
    flexDirection: 'row',
    gap: 8,
  },
  routeChoicePill: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  routeChoicePillActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  routeChoicePillInactive: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  routeDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  routeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  routeName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  routeNameActive: {
    color: '#1d4ed8',
    fontWeight: '800',
  },
  routeViaText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },

  // Header Row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 1,
  },
  driverCountBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  driverCountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
  },
  formulaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  formulaPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },

  // Drivers List (Vertical Cards)
  driversListContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1.5,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  driverCardActive: {
    borderColor: '#2563eb',
    backgroundColor: '#f8fafc',
  },
  driverCardInactive: {
    borderColor: '#e2e8f0',
  },
  driverAvatarCol: {
    position: 'relative',
    marginRight: 12,
  },
  driverAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
  },
  onlineDotBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  onlineInnerDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#2563eb',
  },
  driverInfoCol: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    marginRight: 6,
  },
  nameHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  vehicleModelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 4,
  },
  plateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef08a',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#ca8a04',
    overflow: 'hidden',
  },
  plateIndBadge: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 3,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plateIndText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#ffffff',
  },
  plateBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.4,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    textTransform: 'uppercase',
  },
  vehTypeBadge: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  vehTypeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1d4ed8',
    textTransform: 'capitalize',
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  etaText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
  },
  driverLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  driverLocationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  googleMapsTrackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginTop: 5,
  },
  googleMapsTrackBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1d4ed8',
  },

  // Price Column (Prominent Rate Per KM & Select action)
  priceCol: {
    width: 82,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  ratePerKmBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#93c5fd',
    marginBottom: 8,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  ratePerKmText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1d4ed8',
    textAlign: 'center',
  },
  selectBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 10,
    gap: 3,
    alignSelf: 'stretch',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  selectBtnPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
});
