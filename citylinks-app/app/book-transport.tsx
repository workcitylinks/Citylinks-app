import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  StyleSheet,
  Dimensions,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Animated,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import {
  Menu,
  User,
  MapPin,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Home,
  Search,
  Car,
  X,
  Crosshair,
  Check,
  Clock,
  Calendar,
  Users,
  Crown,
  Navigation,
  Send,
  ShieldCheck,
  Phone,
  RotateCcw,
  ChevronLeft,
  RefreshCw,
  AlertCircle,
} from 'lucide-react-native';
import { useToast } from '../context/ToastContext';
import { useApp } from '../context/AppContext';
import { useTransport } from '../queries/marketplaceQueries';
import { calculateDistanceInMeters } from '../utils/distance';
import { apiClient } from '../api/apiClient';

// Modular Components
import { RealLocationMap, LiveVehicleItem } from '../components/transport/RealLocationMap';
import { PickupDropCard } from '../components/transport/PickupDropCard';
import { SavedPlacesBar, SavedPlaceItem, getSavedPlacesForCity } from '../components/transport/SavedPlacesBar';
import {
  RideOptionsSheet,
  RideChoiceItem,
  RouteOption,
  NearbyDriverItem,
} from '../components/transport/RideOptionsSheet';
import { DriverStatusSheet, RideBookingStatus } from '../components/transport/DriverStatusSheet';
import { OngoingRideSheet } from '../components/transport/OngoingRideSheet';
import { PostTripRatingSheet } from '../components/transport/PostTripRatingSheet';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Local High-Resolution Generated Vehicle & Driver Assets
const RIDE_ASSETS = {
  normal: require('../assets/images/rides/ride_normal.jpg'),
  go: require('../assets/images/rides/ride_mini.jpg'),
  xl: require('../assets/images/rides/ride_xl.jpg'),
  auto: require('../assets/images/rides/ride_auto.jpg'),
  bike: require('../assets/images/rides/ride_bike.jpg'),
  driver: require('../assets/images/rides/ride_driver.jpg'),
};

type RideStep = 'HOME' | 'DRIVER_ACCEPTED' | 'ONGOING_RIDE' | 'POST_TRIP';

interface Coords {
  latitude: number;
  longitude: number;
}

// Default fallback coordinates: Haveri Town Center
const DEFAULT_COORDS: Coords = {
  latitude: 14.7968,
  longitude: 75.401,
};

// Popular Karnataka cities for the city selector modal
const POPULAR_CITIES = [
  { name: 'Haveri', state: 'Karnataka', isHub: true },
  { name: 'Hubballi-Dharwad', state: 'Karnataka' },
  { name: 'Bengaluru', state: 'Karnataka' },
  { name: 'Belagavi', state: 'Karnataka' },
  { name: 'Davanagere', state: 'Karnataka' },
  { name: 'Mysore', state: 'Karnataka' },
  { name: 'Mangaluru', state: 'Karnataka' },
  { name: 'Shivamogga', state: 'Karnataka' },
  { name: 'Kalaburagi', state: 'Karnataka' },
];

export default function BookTransportScreen() {
  const { showSuccess, showError } = useToast();
  const { userToken, userData } = useApp();

  // Ride Booking Step State Machine
  const [currentStep, setCurrentStep] = useState<RideStep>('HOME');
  const [selectedRideId, setSelectedRideId] = useState<string>('normal');
  const [bottomNavTab, setBottomNavTab] = useState<'home' | 'search' | 'rides'>('home');

  // Sheet expansion state: opens only when user clicks "Choose a Ride"
  const [isRideSheetOpen, setIsRideSheetOpen] = useState<boolean>(false);

  // 3. CHOOSE A DRIVER BOTTOM SHEET PULL-UP & PULL-DOWN HEIGHTS
  // Resting: 44% of SCREEN_HEIGHT - leaves destination section & map route completely visible
  // Expanded: 58% of SCREEN_HEIGHT - stops below destination section, NEVER covering it!
  // Peek: 18% of SCREEN_HEIGHT - shows just the handle/title bar to reveal full map
  const CHOOSE_DRIVER_RESTING_HEIGHT = Math.round(SCREEN_HEIGHT * 0.44);
  const CHOOSE_DRIVER_EXPANDED_HEIGHT = Math.round(SCREEN_HEIGHT * 0.58);
  const CHOOSE_DRIVER_PEEK_HEIGHT = Math.round(SCREEN_HEIGHT * 0.18);

  const chooseDriverAnimatedHeight = useRef(new Animated.Value(CHOOSE_DRIVER_RESTING_HEIGHT)).current;
  const chooseDriverStageRef = useRef<'resting' | 'expanded' | 'peek'>('resting');
  const [chooseDriverStage, setChooseDriverStage] = useState<'resting' | 'expanded' | 'peek'>('resting');

  const snapChooseDriverTo = useCallback((stage: 'resting' | 'expanded' | 'peek') => {
    chooseDriverStageRef.current = stage;
    setChooseDriverStage(stage);
    let toVal = CHOOSE_DRIVER_RESTING_HEIGHT;
    if (stage === 'expanded') toVal = CHOOSE_DRIVER_EXPANDED_HEIGHT;
    if (stage === 'peek') toVal = CHOOSE_DRIVER_PEEK_HEIGHT;

    Animated.spring(chooseDriverAnimatedHeight, {
      toValue: toVal,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
  }, [chooseDriverAnimatedHeight]);

  const chooseDriverPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
      onPanResponderMove: (_, gesture) => {
        let startH = CHOOSE_DRIVER_RESTING_HEIGHT;
        if (chooseDriverStageRef.current === 'expanded') startH = CHOOSE_DRIVER_EXPANDED_HEIGHT;
        if (chooseDriverStageRef.current === 'peek') startH = CHOOSE_DRIVER_PEEK_HEIGHT;

        const newH = startH - gesture.dy;
        if (newH >= CHOOSE_DRIVER_PEEK_HEIGHT - 10 && newH <= CHOOSE_DRIVER_EXPANDED_HEIGHT + 15) {
          chooseDriverAnimatedHeight.setValue(newH);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -20 || gesture.vy < -0.4) {
          if (chooseDriverStageRef.current === 'peek') {
            snapChooseDriverTo('resting');
          } else {
            snapChooseDriverTo('expanded');
          }
        } else if (gesture.dy > 20 || gesture.vy > 0.4) {
          if (chooseDriverStageRef.current === 'expanded') {
            snapChooseDriverTo('resting');
          } else {
            snapChooseDriverTo('peek');
          }
        } else if (Math.abs(gesture.dy) < 8) {
          if (chooseDriverStageRef.current === 'resting') {
            snapChooseDriverTo('expanded');
          } else if (chooseDriverStageRef.current === 'expanded') {
            snapChooseDriverTo('resting');
          } else {
            snapChooseDriverTo('resting');
          }
        } else {
          snapChooseDriverTo(chooseDriverStageRef.current);
        }
      },
    })
  ).current;

  const handleOpenRideSheet = useCallback(() => {
    setIsRideSheetOpen(true);
    snapChooseDriverTo('resting');
  }, [snapChooseDriverTo]);

  const handleToggleViewMap = useCallback(() => {
    if (chooseDriverStageRef.current === 'peek') {
      snapChooseDriverTo('resting');
    } else {
      snapChooseDriverTo('peek');
    }
  }, [snapChooseDriverTo]);

  // Location State (auto-filled from device GPS / profile)
  const [cityName, setCityName] = useState<string>('Detecting...');
  const [pickupAddress, setPickupAddress] = useState<string>('');
  const [destinationAddress, setDestinationAddress] = useState<string>('');
  const [pickupCoords, setPickupCoords] = useState<Coords | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<Coords | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Real-time Database Vehicles on Map
  const [liveVehicles, setLiveVehicles] = useState<LiveVehicleItem[]>([]);

  // Dynamic Route & Fare Calculation State
  const [distanceKm, setDistanceKm] = useState<number>(3.5);
  const [availableRoutes, setAvailableRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('fastest');
  const [dynamicFares, setDynamicFares] = useState<
    Record<string, { fare: string; totalFare: number; formula: string; ratePerKm: number; baseFare: number }>
  >({});
  const [isCalculatingFares, setIsCalculatingFares] = useState<boolean>(false);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [selectedDriver, setSelectedDriver] = useState<NearbyDriverItem | null>(null);
  const [bookingStatus, setBookingStatus] = useState<RideBookingStatus>('IDLE');
  const [isRequestingRide, setIsRequestingRide] = useState<boolean>(false);
  const [cancelSecondsRemaining, setCancelSecondsRemaining] = useState<number>(60);
  const [canCancel, setCanCancel] = useState<boolean>(true);
  const [isOtpVerified, setIsOtpVerified] = useState<boolean>(false);
  const [isDestinationReached, setIsDestinationReached] = useState<boolean>(false);
  const [isCompletingRide, setIsCompletingRide] = useState<boolean>(false);

  // Driver simulation states
  const [countdownSeconds, setCountdownSeconds] = useState<number>(272);
  const [carProgress, setCarProgress] = useState<number>(0.3);

  // Post-Trip state
  const [driverRating, setDriverRating] = useState<number>(5);
  const [feedbackText, setFeedbackText] = useState<string>('');


  const [addNewModalVisible, setAddNewModalVisible] = useState<boolean>(false);
  const [newPlaceName, setNewPlaceName] = useState<string>('');
  const [newPlaceAddress, setNewPlaceAddress] = useState<string>('');
  const [cityModalVisible, setCityModalVisible] = useState<boolean>(false);
  const [citySearchQuery, setCitySearchQuery] = useState<string>('');

  // Passenger My Rides & Trip History
  const [passengerRides, setPassengerRides] = useState<any[]>([]);
  const [passengerActiveRides, setPassengerActiveRides] = useState<any[]>([]);
  const [passengerHistoryRides, setPassengerHistoryRides] = useState<any[]>([]);
  const [loadingMyRides, setLoadingMyRides] = useState<boolean>(false);
  const [ridesSheetSubTab, setRidesSheetSubTab] = useState<'ongoing' | 'history'>('ongoing');

  // Fetch passenger's active & past rides from server
  const fetchMyRides = useCallback(async () => {
    try {
      setLoadingMyRides(true);
      const res = await apiClient.get('/transport/my-rides');
      if (res.data?.success) {
        setPassengerRides(res.data.rides || []);
        setPassengerActiveRides(res.data.activeRides || []);
        setPassengerHistoryRides(res.data.historyRides || []);

        // Auto-sync active booking from server
        if (res.data.activeRides && res.data.activeRides.length > 0) {
          const matched = (activeBooking?.id ? res.data.activeRides.find((r: any) => r.id === activeBooking.id) : null) || res.data.activeRides[0];
          setActiveBooking((prev: any) => ({
            ...prev,
            ...matched,
            fare: `₹${matched.totalFare}`,
          }));
          setBookingStatus(matched.status as any);
          if (matched.status === 'ACCEPTED') {
            if (currentStep === 'HOME') setCurrentStep('DRIVER_ACCEPTED');
          } else if (matched.status === 'ONGOING' || matched.status === 'DESTINATION_REACHED') {
            if (currentStep === 'HOME' || currentStep === 'DRIVER_ACCEPTED') setCurrentStep('ONGOING_RIDE');
          }
        } else if (activeBooking?.id) {
          const matchedHistory = res.data.historyRides?.find((h: any) => h.id === activeBooking.id);
          if (matchedHistory?.status === 'CANCELLED') {
            setBookingStatus('CANCELLED');
            setActiveBooking((prev: any) => (prev ? { ...prev, status: 'CANCELLED', otp: null } : null));
          }
        }
      }
    } catch (e) {
      // ignore
    } finally {
      setLoadingMyRides(false);
    }
  }, [activeBooking?.id]);

  const handleRidesTabPress = useCallback(() => {
    setBottomNavTab('rides');
    fetchMyRides();
    if (activeBooking?.id && bookingStatus !== 'IDLE') {
      setRidesSheetSubTab('ongoing');
    } else if (passengerHistoryRides.length > 0) {
      setRidesSheetSubTab('history');
    } else {
      setRidesSheetSubTab('ongoing');
    }
  }, [fetchMyRides, activeBooking?.id, bookingStatus, passengerHistoryRides.length]);

  const handleBookAgain = useCallback((trip: any) => {
    if (trip?.destinationAddress) {
      setDestinationAddress(trip.destinationAddress);
      if (trip.pickupAddress) {
        setPickupAddress(trip.pickupAddress);
      }
      setBottomNavTab('home');
      setCurrentStep('HOME');
      setIsRideSheetOpen(true);
      showSuccess(`Rebooking trip to ${trip.destinationAddress}`, 'Trip Selected');
    }
  }, [showSuccess]);

  // Fetch Real-time Vehicles from Database
  const fetchLiveVehicles = useCallback(async (lat?: number, lng?: number) => {
    try {
      const pLat = lat ?? pickupCoords?.latitude ?? DEFAULT_COORDS.latitude;
      const pLng = lng ?? pickupCoords?.longitude ?? DEFAULT_COORDS.longitude;
      const res = await apiClient.get('/transport/live-vehicles', {
        params: { userLat: pLat, userLng: pLng, type: 'passenger' },
      });
      if (res.data && Array.isArray(res.data)) {
        setLiveVehicles(res.data);
      }
    } catch (e) {
      // ignore
    }
  }, [pickupCoords]);

  // Helper: Geocode address string to Coordinates
  const geocodeAddress = async (addr: string): Promise<Coords | null> => {
    if (!addr || !addr.trim()) return null;
    try {
      const results = await Location.geocodeAsync(addr.trim());
      if (results && results.length > 0) {
        return { latitude: results[0].latitude, longitude: results[0].longitude };
      }
    } catch (err) {
      // ignore
    }
    return null;
  };

  // Auto Fetch Real Device GPS Location (Called automatically on mount)
  const handleAutoFetchLocation = useCallback(async (silent = false) => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!silent) {
          showError('Location permission is required to detect pickup point', 'Permission Denied');
        }
        // Fallback gracefully to user profile address or Haveri center
        if (!pickupCoords) {
          setPickupCoords(DEFAULT_COORDS);
          setCityName('Haveri');
          if (!pickupAddress) setPickupAddress('Haveri Town Center, Karnataka');
          fetchLiveVehicles(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude);
        }
        setIsLocating(false);
        return;
      }

      // 1. Try instant last known position for near-zero delay
      let location: Location.LocationObject | null = null;
      try {
        location = await Location.getLastKnownPositionAsync();
      } catch {}

      // 2. Fetch fresh balanced GPS position
      if (!location) {
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      }

      if (location?.coords) {
        const coords: Coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setPickupCoords(coords);

        fetchLiveVehicles(coords.latitude, coords.longitude);

        const [geo] = await Location.reverseGeocodeAsync(coords);
        if (geo) {
          const detectedCity = geo.city || geo.district || geo.subregion || 'Haveri';
          setCityName(detectedCity);

          const parts = [
            geo.name,
            geo.street,
            geo.district || geo.subregion || geo.city,
          ].filter(Boolean);

          const fullAddr = parts.length > 0 ? parts.join(', ') : `${detectedCity}, Karnataka`;
          setPickupAddress(fullAddr);
          if (!silent) {
            showSuccess(`Located at ${fullAddr}`, 'GPS Updated');
          }
        }
      }
    } catch (err: any) {
      if (!silent) {
        showError('Unable to detect current GPS location', 'Location Error');
      }
      if (!pickupCoords) {
        setPickupCoords(DEFAULT_COORDS);
        setCityName('Haveri');
        if (!pickupAddress) setPickupAddress('Haveri Town Center, Karnataka');
        fetchLiveVehicles(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude);
      }
    } finally {
      setIsLocating(false);
    }
  }, [pickupCoords, pickupAddress, showError, showSuccess, fetchLiveVehicles]);

  // ON MOUNT: Auto-fill user's location immediately on starting
  useEffect(() => {
    if (userData?.address && !pickupAddress) {
      setPickupAddress(userData.address);
      geocodeAddress(userData.address).then((c) => {
        if (c) {
          setPickupCoords(c);
          fetchLiveVehicles(c.latitude, c.longitude);
        }
      });
    }
    handleAutoFetchLocation(true);
  }, []);

  // Periodic Real-Time Refresh for Live DB Vehicles & Passenger Rides
  useEffect(() => {
    fetchMyRides();
    const liveTimer = setInterval(() => {
      fetchLiveVehicles();
      fetchMyRides();
    }, 8000);
    return () => clearInterval(liveTimer);
  }, [fetchLiveVehicles, fetchMyRides]);

  // Calculate Dynamic Distance & Fares (km x rate/km)
  const calculateRouteAndFares = useCallback(
    async (pCoords: Coords | null, dCoords: Coords | null, destText: string) => {
      let dist = 3.5;
      if (pCoords && dCoords) {
        const straightMeters = calculateDistanceInMeters(
          pCoords.latitude,
          pCoords.longitude,
          dCoords.latitude,
          dCoords.longitude
        );
        dist = Math.max(0.8, parseFloat(((straightMeters * 1.25) / 1000).toFixed(1)));
      }
      setDistanceKm(dist);

      try {
        setIsCalculatingFares(true);
        const res = await apiClient.post('/transport/calculate-fare', {
          distanceKm: dist,
          pickupAddress: pickupAddress || 'Current Location',
          destinationAddress: destText,
        });

        if (res.data) {
          if (res.data.routes) {
            setAvailableRoutes(res.data.routes);
          }
          if (res.data.fares) {
            const fareMap: any = {};
            res.data.fares.forEach((f: any) => {
              fareMap[f.category] = {
                fare: f.fareText,
                totalFare: f.totalFare,
                formula: f.formula,
                ratePerKm: f.ratePerKm,
                baseFare: f.baseFare,
              };
            });
            setDynamicFares(fareMap);
          }
        }
      } catch (apiErr) {
        // Fallback default calculation based on driver rates
        const fallbackMap: any = {
          normal: {
            fare: `₹${Math.round(dist * 22 + 40)}`,
            totalFare: Math.round(dist * 22 + 40),
            formula: `${dist} km × ₹22/km + ₹40 base = ₹${Math.round(dist * 22 + 40)}`,
            ratePerKm: 22,
            baseFare: 40,
          },
          go: {
            fare: `₹${Math.round(dist * 18 + 30)}`,
            totalFare: Math.round(dist * 18 + 30),
            formula: `${dist} km × ₹18/km + ₹30 base = ₹${Math.round(dist * 18 + 30)}`,
            ratePerKm: 18,
            baseFare: 30,
          },
          xl: {
            fare: `₹${Math.round(dist * 28 + 60)}`,
            totalFare: Math.round(dist * 28 + 60),
            formula: `${dist} km × ₹28/km + ₹60 base = ₹${Math.round(dist * 28 + 60)}`,
            ratePerKm: 28,
            baseFare: 60,
          },
          auto: {
            fare: `₹${Math.round(dist * 14 + 25)}`,
            totalFare: Math.round(dist * 14 + 25),
            formula: `${dist} km × ₹14/km + ₹25 base = ₹${Math.round(dist * 14 + 25)}`,
            ratePerKm: 14,
            baseFare: 25,
          },
        };
        setDynamicFares(fallbackMap);
        setAvailableRoutes([
          {
            id: 'fastest',
            name: 'Fastest Route',
            via: 'via Main Road / Highway',
            distanceKm: dist,
            durationMin: Math.round(dist * 2.5 + 2),
            traffic: 'Normal traffic',
            isRecommended: true,
          },
          {
            id: 'alternate',
            name: 'Alternate Route',
            via: 'via Ring Road / Bypass',
            distanceKm: parseFloat((dist * 1.15).toFixed(1)),
            durationMin: Math.round(dist * 3 + 3),
            traffic: 'Light traffic',
            isRecommended: false,
          },
        ]);
      } finally {
        setIsCalculatingFares(false);
      }
    },
    [pickupAddress]
  );

  // Dynamic Ride Choices Options (km x rate/km)
  const rideChoices: RideChoiceItem[] = useMemo(
    () => [
      {
        id: 'normal',
        name: 'Normal',
        eta: '2 min',
        seats: 4,
        image: RIDE_ASSETS.normal,
        fare: dynamicFares['normal']?.fare || `₹${Math.round(distanceKm * 22 + 40)}`,
        ratePerKm: dynamicFares['normal']?.ratePerKm || 22,
        baseFare: dynamicFares['normal']?.baseFare || 40,
        totalFare: dynamicFares['normal']?.totalFare || Math.round(distanceKm * 22 + 40),
        formula:
          dynamicFares['normal']?.formula ||
          `${distanceKm} km × ₹22/km + ₹40 = ₹${Math.round(distanceKm * 22 + 40)}`,
      },
      {
        id: 'go',
        name: 'Go',
        eta: '5 min',
        seats: 4,
        image: RIDE_ASSETS.go,
        fare: dynamicFares['go']?.fare || `₹${Math.round(distanceKm * 18 + 30)}`,
        ratePerKm: dynamicFares['go']?.ratePerKm || 18,
        baseFare: dynamicFares['go']?.baseFare || 30,
        totalFare: dynamicFares['go']?.totalFare || Math.round(distanceKm * 18 + 30),
        formula:
          dynamicFares['go']?.formula ||
          `${distanceKm} km × ₹18/km + ₹30 = ₹${Math.round(distanceKm * 18 + 30)}`,
      },
      {
        id: 'xl',
        name: 'XL',
        eta: '8 min',
        seats: 6,
        image: RIDE_ASSETS.xl,
        fare: dynamicFares['xl']?.fare || `₹${Math.round(distanceKm * 28 + 60)}`,
        ratePerKm: dynamicFares['xl']?.ratePerKm || 28,
        baseFare: dynamicFares['xl']?.baseFare || 60,
        totalFare: dynamicFares['xl']?.totalFare || Math.round(distanceKm * 28 + 60),
        formula:
          dynamicFares['xl']?.formula ||
          `${distanceKm} km × ₹28/km + ₹60 = ₹${Math.round(distanceKm * 28 + 60)}`,
      },
      {
        id: 'auto',
        name: 'Auto',
        eta: '6 min',
        seats: 3,
        image: RIDE_ASSETS.auto,
        fare: dynamicFares['auto']?.fare || `₹${Math.round(distanceKm * 14 + 25)}`,
        ratePerKm: dynamicFares['auto']?.ratePerKm || 14,
        baseFare: dynamicFares['auto']?.baseFare || 25,
        totalFare: dynamicFares['auto']?.totalFare || Math.round(distanceKm * 14 + 25),
        formula:
          dynamicFares['auto']?.formula ||
          `${distanceKm} km × ₹14/km + ₹25 = ₹${Math.round(distanceKm * 14 + 25)}`,
      },
    ],
    [dynamicFares, distanceKm]
  );

  const selectedRide = rideChoices.find((r) => r.id === selectedRideId) || rideChoices[0];

  // Nearby Drivers List with dynamic rates per km and total fares based on distance
  const nearbyDrivers: NearbyDriverItem[] = useMemo(() => {
    if (liveVehicles && liveVehicles.length > 0) {
      return liveVehicles.map((v) => {
        const ratePerKm = v.ratePerKm || 20;
        const baseFare = v.baseFare || 30;
        const totalFare = Math.round(distanceKm * ratePerKm + baseFare);

        let driverImg = RIDE_ASSETS.driver;
        const vCat = (v.categoryCode || '').toLowerCase();
        const vType = (v.vehicleType || '').toLowerCase();
        if (vCat === 'auto' || vType.includes('auto')) {
          driverImg = RIDE_ASSETS.auto;
        } else if (vCat === 'bike' || vType.includes('bike')) {
          driverImg = RIDE_ASSETS.bike;
        } else if (vCat === 'xl' || vType.includes('suv') || vType.includes('xl')) {
          driverImg = RIDE_ASSETS.xl;
        } else if (vCat === 'go' || vType.includes('mini')) {
          driverImg = RIDE_ASSETS.go;
        } else {
          driverImg = RIDE_ASSETS.normal;
        }

        return {
          id: v.id,
          name: v.name,
          driverCar: v.driverCar || 'White Toyota Corolla',
          driverPlate: v.driverPlate || 'KA 03 AB 1234',
          vehicleType: v.vehicleType || 'Normal Car',
          categoryCode: v.categoryCode || 'normal',
          ratePerKm,
          baseFare,
          rating: v.rating || 4.8,
          phone: v.phone || '9876543210',
          eta: v.eta || '2 min away',
          totalFare,
          formula: `${distanceKm} km × ₹${ratePerKm}/km + ₹${baseFare} base = ₹${totalFare}`,
          image: driverImg,
          location: (v as any).location || 'Ashwini Nagar, Haveri',
          latitude: v.latitude,
          longitude: v.longitude,
        };
      });
    }

    const defaultDrivers = [
      {
        id: 'adb8de03-eba9-4921-b458-817fcd5d605f',
        name: 'Ramesh P.',
        driverCar: 'Silver Maruti WagonR',
        driverPlate: 'KA 27 B 5678',
        vehicleType: 'Go Mini (4 Seats)',
        categoryCode: 'go',
        ratePerKm: 18,
        baseFare: 30,
        rating: 4.7,
        phone: '9845112233',
        eta: '5 min away',
        image: RIDE_ASSETS.go,
        location: 'Haveri Railway Station',
        latitude: 14.7935,
        longitude: 75.4055,
      },
      {
        id: '1b94af08-55fb-4b15-9b5d-87a4eb605424',
        name: 'Manjunath H.',
        driverCar: 'Bajaj RE Auto Rickshaw',
        driverPlate: 'KA 27 E 3456',
        vehicleType: 'Auto Rickshaw (3 Seats)',
        categoryCode: 'auto',
        ratePerKm: 14,
        baseFare: 25,
        rating: 4.8,
        phone: '9845114422',
        eta: '4 min away',
        image: RIDE_ASSETS.auto,
        location: 'KSRTC Old Bus Stand',
        latitude: 14.7940,
        longitude: 75.3960,
      },
      {
        id: 'b191467a-6314-4dc5-9857-c5a527d5c544',
        name: 'Sahin',
        driverCar: 'Maruti Suzuki Dzire',
        driverPlate: 'KA 27 M 1234',
        vehicleType: 'Sedan (4 Seats)',
        categoryCode: 'normal',
        ratePerKm: 20,
        baseFare: 35,
        rating: 4.9,
        phone: '9449084242',
        eta: '3 min away',
        image: RIDE_ASSETS.normal,
        location: 'Ashwini Nagar, Haveri',
        latitude: 14.7968,
        longitude: 75.4010,
      },
      {
        id: '8a62a1e1-e092-4785-a177-2dbef58c82af',
        name: 'Karthik R.',
        driverCar: 'White Toyota Corolla',
        driverPlate: 'KA 03 AB 1234',
        vehicleType: 'Sedan (4 Seats)',
        categoryCode: 'normal',
        ratePerKm: 22,
        baseFare: 40,
        rating: 4.8,
        phone: '9876543210',
        eta: '2 min away',
        image: RIDE_ASSETS.normal,
        location: 'CityLinks Central Hub',
        latitude: 14.7995,
        longitude: 75.3985,
      },
      {
        id: '73c8c4a4-e41d-4bc3-affb-49a8be2cabad',
        name: 'Suresh Kumar',
        driverCar: 'Grey Toyota Innova',
        driverPlate: 'KA 04 CD 9012',
        vehicleType: 'XL SUV (6 Seats)',
        categoryCode: 'xl',
        ratePerKm: 28,
        baseFare: 60,
        rating: 4.9,
        phone: '9988776655',
        eta: '7 min away',
        image: RIDE_ASSETS.xl,
        location: 'PB Road Bypass, Haveri',
        latitude: 14.8020,
        longitude: 75.4070,
      },
      {
        id: '986a2a35-d065-475b-a3d3-8681a0880f05',
        name: 'Anand S.',
        driverCar: 'Hero Splendor Plus',
        driverPlate: 'KA 27 H 7890',
        vehicleType: 'Bike Taxi (1 Seat)',
        categoryCode: 'bike',
        ratePerKm: 8,
        baseFare: 15,
        rating: 4.9,
        phone: '9980556633',
        eta: '3 min away',
        image: RIDE_ASSETS.bike,
        location: 'Gandhi Circle / Market Road',
        latitude: 14.8010,
        longitude: 75.4020,
      },
    ];

    return defaultDrivers.map((d) => {
      const totalFare = Math.round(distanceKm * d.ratePerKm + d.baseFare);
      return {
        ...d,
        totalFare,
        formula: `${distanceKm} km × ₹${d.ratePerKm}/km + ₹${d.baseFare} base = ₹${totalFare}`,
      };
    });
  }, [liveVehicles, distanceKm]);

  // Dynamic Saved Places based on detected city
  const savedPlaces = useMemo(() => getSavedPlacesForCity(cityName), [cityName]);

  // Swap Pickup & Destination
  const handleSwapAddresses = () => {
    const tempAddr = pickupAddress;
    const tempCoords = pickupCoords;
    setPickupAddress(destinationAddress);
    setPickupCoords(destinationCoords);
    setDestinationAddress(tempAddr);
    setDestinationCoords(tempCoords);
    showSuccess('Pickup & drop locations swapped', 'Swapped');
    if (tempCoords && pickupCoords) {
      calculateRouteAndFares(tempCoords, pickupCoords, tempAddr);
    }
  };

  // Submit edited pickup address
  const handlePickupSubmit = async () => {
    if (!pickupAddress.trim()) return;
    const coords = await geocodeAddress(pickupAddress);
    if (coords) {
      setPickupCoords(coords);
      showSuccess(`Pickup updated: ${pickupAddress.trim()}`, 'Location Set');
      fetchLiveVehicles(coords.latitude, coords.longitude);
      if (destinationCoords) {
        calculateRouteAndFares(coords, destinationCoords, destinationAddress);
      }
    }
  };

  // Select Saved Place
  const handleSelectSavedPlace = async (place: SavedPlaceItem) => {
    const targetAddr = place.address || place.label;
    setDestinationAddress(targetAddr);
    const coords = await geocodeAddress(targetAddr);
    if (coords) {
      setDestinationCoords(coords);
      calculateRouteAndFares(pickupCoords, coords, targetAddr);
    }
    showSuccess(`Destination set to ${place.label}`, 'Place Selected');
  };

  // Submit Destination
  const handleDestinationSubmit = async () => {
    if (!destinationAddress.trim()) {
      showError('Please type a destination to search route', 'Destination Required');
      return;
    }
    const coords = await geocodeAddress(destinationAddress.trim());
    let pCoords = pickupCoords;
    if (!pCoords && pickupAddress.trim()) {
      pCoords = await geocodeAddress(pickupAddress);
      if (pCoords) setPickupCoords(pCoords);
    }

    if (coords) {
      setDestinationCoords(coords);
      await calculateRouteAndFares(pCoords, coords, destinationAddress.trim());
      showSuccess(`Route mapped to ${destinationAddress.trim()} (${distanceKm} km)`, 'Route Found');
    } else {
      showError('Could not find destination coordinates. Please check spelling.', 'Not Found');
    }
  };

  // Select / Change City
  const handleSelectCity = async (selectedCity: string) => {
    setCityName(selectedCity);
    setCityModalVisible(false);
    const coords = await geocodeAddress(`${selectedCity}, Karnataka, India`);
    if (coords) {
      setPickupCoords(coords);
      setPickupAddress(`${selectedCity} Center`);
      fetchLiveVehicles(coords.latitude, coords.longitude);
      if (destinationCoords) {
        calculateRouteAndFares(coords, destinationCoords, destinationAddress);
      }
    }
    showSuccess(`City changed to ${selectedCity}`, 'City Updated');
  };

  // Map Stabilizer Callback
  const handleStabilizeMap = () => {
    showSuccess('Map stabilized to your current location', 'Map Stabilized');
  };

  // User selects a specific nearby driver -> advances to driver review stage (IDLE state, OTP NOT yet shown)
  const handleSelectDriver = (driver: NearbyDriverItem) => {
    if (!destinationAddress.trim()) {
      showError('Please enter a destination to choose a driver', 'Destination Required');
      return;
    }

    setSelectedDriver(driver);
    setBookingStatus('IDLE');
    setCancelSecondsRemaining(60);
    setCanCancel(true);
    setIsOtpVerified(false);
    setIsDestinationReached(false);

    const computedFare =
      driver.totalFare ||
      Math.round(distanceKm * (driver.ratePerKm || 20) + (driver.baseFare || 30));

    setActiveBooking({
      id: undefined,
      driverName: driver.name,
      driverCar: driver.driverCar,
      driverPlate: driver.driverPlate,
      driverPhone: driver.phone || '9876543210',
      driverRating: driver.rating || 4.8,
      ratePerKm: driver.ratePerKm || 22,
      baseFare: driver.baseFare || 40,
      totalFare: computedFare,
      fare: `₹${computedFare}`,
      distanceKm,
      otp: null, // Hidden until driver approves!
      vehicleType: driver.vehicleType,
      pickupAddress: pickupAddress || 'Current Location',
      destinationAddress: destinationAddress.trim(),
      image: driver.image,
      location: driver.location,
      latitude: driver.latitude,
      longitude: driver.longitude,
    });

    setCarProgress(0.15);
    setIsRideSheetOpen(false);
    setCurrentStep('DRIVER_ACCEPTED');
  };

  // User taps "Request Ride to [Driver Name]" button in DriverStatusSheet
  const handleRequestRide = async () => {
    const driver = selectedDriver || nearbyDrivers[0];
    if (!driver) {
      showError('Please select a driver first', 'No Driver Selected');
      return;
    }

    try {
      setIsRequestingRide(true);
      showSuccess(`Sending ride request to ${driver.name}...`, 'Requesting');

      const res = await apiClient.post('/transport/book', {
        driverId: driver.id,
        driverName: driver.name,
        driverPlate: driver.driverPlate,
        driverPhone: driver.phone,
        rideType: driver.categoryCode || 'normal',
        pickupAddress: pickupAddress || 'Current Location',
        pickupLat: pickupCoords?.latitude,
        pickupLng: pickupCoords?.longitude,
        destinationAddress: destinationAddress.trim(),
        destinationLat: destinationCoords?.latitude,
        destinationLng: destinationCoords?.longitude,
        distanceKm: distanceKm || 3.5,
        paymentMethod: 'CASH',
      });

      if (res.data?.booking) {
        setActiveBooking({
          ...res.data.booking,
          image: driver.image,
          vehicleType: driver.vehicleType,
          otp: null, // Hidden until driver approves!
        });
        setBookingStatus('REQUESTED');
        setCancelSecondsRemaining(60);
        setCanCancel(true);
        showSuccess(
          `Ride request sent to ${driver.name}! Driver has been notified in their dashboard.`,
          'Request Sent'
        );
      }
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to send ride request', 'Request Failed');
    } finally {
      setIsRequestingRide(false);
    }
  };

  // Start Booking with first nearby driver
  const handleStartBooking = async () => {
    if (nearbyDrivers.length > 0) {
      handleSelectDriver(nearbyDrivers[0]);
    } else {
      showError('No drivers currently available', 'Unavailable');
    }
  };

  // Driver ongoing ride progress simulation
  useEffect(() => {
    let timer: any = null;
    if (currentStep === 'ONGOING_RIDE') {
      timer = setInterval(() => {
        setCarProgress((prev) => (prev < 0.95 ? prev + 0.015 : 0.2));
      }, 1200);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [currentStep]);

  // 60-second cancellation window countdown timer
  useEffect(() => {
    let timer: any = null;
    if (
      (bookingStatus === 'REQUESTED' || bookingStatus === 'ACCEPTED') &&
      cancelSecondsRemaining > 0
    ) {
      timer = setInterval(() => {
        setCancelSecondsRemaining((prev) => {
          if (prev <= 1) {
            setCanCancel(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [bookingStatus, cancelSecondsRemaining]);

  // Real-time polling to monitor booking status (REQUESTED -> ACCEPTED -> ONGOING -> DESTINATION_REACHED -> COMPLETED)
  useEffect(() => {
    let pollTimer: any = null;
    if (activeBooking?.id && bookingStatus !== 'IDLE' && bookingStatus !== 'CANCELLED' && bookingStatus !== 'COMPLETED') {
      pollTimer = setInterval(async () => {
        try {
          const res = await apiClient.get(`/transport/bookings/${activeBooking.id}`);
          const booking = res.data;
          if (!booking) return;

          // 1. Driver APPROVED the ride request
          if (booking.status === 'ACCEPTED' && bookingStatus !== 'ACCEPTED') {
            setBookingStatus('ACCEPTED');
            setActiveBooking((prev: any) => ({
              ...prev,
              ...booking,
              otp: booking.otp, // Real OTP now revealed!
            }));
            fetchMyRides();
            showSuccess(
              `Ride approved by ${booking.driverName}! Share OTP ${booking.otp} when driver arrives.`,
              'Ride Approved'
            );
          }

          // 2. Driver entered OTP in dashboard and started ride
          if (booking.status === 'ONGOING' && currentStep !== 'ONGOING_RIDE') {
            setIsOtpVerified(true);
            setBookingStatus('ONGOING');
            setCarProgress(0.25);
            setCurrentStep('ONGOING_RIDE');
            fetchMyRides();
            showSuccess(
              `Driver verified OTP! Trip to ${booking.destinationAddress} has started.`,
              'Ride Started'
            );
          }

          // 3. Driver reached destination
          if (booking.status === 'DESTINATION_REACHED' && !isDestinationReached) {
            setIsDestinationReached(true);
            setBookingStatus('DESTINATION_REACHED');
            fetchMyRides();
            showSuccess(
              `📍 Destination reached! Please confirm and complete your ride.`,
              'Destination Reached'
            );
          }

          // 4. Driver declined or cancelled
          if (booking.status === 'CANCELLED') {
            setBookingStatus('CANCELLED');
            setActiveBooking((prev: any) => (prev ? { ...prev, status: 'CANCELLED', otp: null } : null));
            showError('Ride was cancelled or declined by driver.', 'Ride Cancelled');
            fetchMyRides();
          }

          // 5. Driver or passenger completed ride
          if (booking.status === 'COMPLETED') {
            fetchMyRides();
            handleResetToHome();
          }
        } catch (e) {
          // ignore polling errors
        }
      }, 2000);
    }
    return () => {
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [activeBooking?.id, bookingStatus, currentStep, isDestinationReached, fetchMyRides]);

  const handleResetToHome = () => {
    setCurrentStep('HOME');
    setIsRideSheetOpen(false);
    setActiveBooking(null);
    setSelectedDriver(null);
    setBookingStatus('IDLE');
    setIsOtpVerified(false);
    setIsDestinationReached(false);
    setIsRequestingRide(false);
    setCancelSecondsRemaining(60);
    setCanCancel(true);
    setDestinationAddress('');
    setDestinationCoords(null);
    setCarProgress(0.3);
  };

  const handleCallDriver = () => {
    const phone = activeBooking?.driverPhone || selectedDriver?.phone || '9876543210';
    Linking.openURL(`tel:${phone}`);
  };



  const handleCancelRide = () => {
    // If in IDLE state, simply return to driver selection
    if (bookingStatus === 'IDLE' || !activeBooking?.id) {
      setCurrentStep('HOME');
      setIsRideSheetOpen(true);
      setActiveBooking(null);
      return;
    }

    // 1-minute cancellation window check if ACCEPTED
    if (bookingStatus === 'ACCEPTED' && (!canCancel || cancelSecondsRemaining <= 0)) {
      Alert.alert(
        'Cancellation Locked',
        'Rides can only be cancelled within 1 minute of requesting. The driver is already en route.'
      );
      return;
    }

    Alert.alert(
      'Cancel Ride?',
      `Are you sure you want to cancel this ride request? ${
        canCancel && cancelSecondsRemaining > 0
          ? `(${cancelSecondsRemaining}s left in free cancellation window)`
          : ''
      }`,
      [
        { text: 'Keep Ride', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            if (activeBooking?.id) {
              try {
                await apiClient.post(`/transport/bookings/${activeBooking.id}/cancel`);
              } catch (e: any) {
                const errMsg = e.response?.data?.error || 'Failed to cancel ride';
                showError(errMsg, 'Cancellation Error');
                return;
              }
            }
            showSuccess('Ride cancelled successfully', 'Cancelled');
            setBookingStatus('CANCELLED');
            setActiveBooking((prev: any) => (prev ? { ...prev, status: 'CANCELLED', otp: null } : null));
            fetchMyRides();
          },
        },
      ]
    );
  };

  const handleStartOngoingRide = async () => {
    if (!isOtpVerified && activeBooking?.id) {
      try {
        const chk = await apiClient.get(`/transport/bookings/${activeBooking.id}`);
        if (chk.data?.status === 'ONGOING') {
          setIsOtpVerified(true);
          setCarProgress(0.25);
          setCurrentStep('ONGOING_RIDE');
        } else {
          showError(
            `Ride cannot start yet! Driver must enter OTP (${activeBooking?.otp || 'PIN'}) in their dashboard.`,
            'Driver OTP Verification Required'
          );
          return;
        }
      } catch (e) {
        showError(
          `Waiting for driver to verify OTP (${activeBooking?.otp || 'PIN'}) in dashboard.`,
          'Verification Required'
        );
        return;
      }
    }
  };

  // Passenger SOS: Emergency call directly to Indian Police (100)
  const handleEmergencyPoliceCall = () => {
    Linking.openURL('tel:100').catch(() => {
      Alert.alert(
        'Emergency Assistance',
        'Unable to auto-dial. Please call 100 directly on your phone.',
        [{ text: 'OK' }]
      );
    });
  };

  const handleOpenGoogleMaps = useCallback((driver?: any) => {
    if (!driver) return;
    const dLat = driver.latitude || 14.7968;
    const dLng = driver.longitude || 75.4010;
    const label = encodeURIComponent(driver.name || 'Driver Location');

    let url = `https://www.google.com/maps/dir/?api=1&destination=${dLat},${dLng}&travelmode=driving`;
    if (pickupCoords?.latitude && pickupCoords?.longitude) {
      url += `&origin=${pickupCoords.latitude},${pickupCoords.longitude}`;
    }

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          const fallback =
            Platform.OS === 'android'
              ? `geo:${dLat},${dLng}?q=${dLat},${dLng}(${label})`
              : `http://maps.apple.com/?ll=${dLat},${dLng}&q=${label}`;
          Linking.openURL(fallback);
        }
      })
      .catch(() => {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${dLat},${dLng}`);
      });
  }, [pickupCoords]);

  // Passenger presses Complete Ride -> Ends ride, notifies both driver and passenger, and returns to HOME
  const handleCompleteRide = async () => {
    try {
      setIsCompletingRide(true);
      if (activeBooking?.id) {
        await apiClient.post(`/transport/bookings/${activeBooking.id}/complete`, {
          rating: 5,
          feedback: 'Ride completed successfully',
        });
      }
      showSuccess(
        'Ride completed successfully! Both you and the driver have been notified.',
        'Trip Completed'
      );
      // Directly returns to starting transport page ready for other rides!
      handleResetToHome();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to complete ride', 'Error');
    } finally {
      setIsCompletingRide(false);
    }
  };

  const handleSubmitPostTrip = async () => {
    handleCompleteRide();
  };

  // Filtered cities for modal
  const filteredCities = POPULAR_CITIES.filter((c) =>
    c.name.toLowerCase().includes(citySearchQuery.toLowerCase().trim())
  );

  return (
    <View style={styles.screenContainer}>
      {/* 1. TOP HEADER SECTION: TOP BAR & PICKUP/DROP CARD (WHITE & BLUE THEME) */}
      <SafeAreaView edges={['top']} style={styles.topHeaderSection}>
        {/* TOP BAR */}
        <View style={styles.topBarRow}>
          {/* Back / Menu Button */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.replace('/')}
            style={styles.circularIconBtn}
          >
            <Menu size={20} color="#1e293b" />
          </TouchableOpacity>

          {/* Center City Dropdown Pill */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setCityModalVisible(true)}
            style={styles.centerCityPill}
          >
            <View style={styles.cityTitleRow}>
              <MapPin size={16} color="#2563eb" style={{ marginRight: 5 }} />
              <Text style={styles.cityNameText} numberOfLines={1}>
                {cityName}
              </Text>
              <ChevronDown size={14} color="#1e293b" style={{ marginLeft: 3 }} />
            </View>
            <Text style={styles.citySubText}>Live • Tap to change</Text>
          </TouchableOpacity>

          {/* Circular User Profile Button */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/profile')}
            style={styles.circularIconBtn}
          >
            <User size={20} color="#1e293b" />
          </TouchableOpacity>
        </View>

        {/* PICKUP & DROP CARD WITH SEARCH BUTTON BESIDE DESTINATION */}
        <PickupDropCard
          pickupAddress={pickupAddress}
          setPickupAddress={setPickupAddress}
          destinationAddress={destinationAddress}
          setDestinationAddress={setDestinationAddress}
          isLocating={isLocating}
          onAutoFetchLocation={() => handleAutoFetchLocation(false)}
          onSwapAddresses={handleSwapAddresses}
          onSubmitDestination={handleDestinationSubmit}
          onSubmitPickup={handlePickupSubmit}
        />
      </SafeAreaView>

      {/* 2. MAP AREA: POSITIONED DIRECTLY BELOW THE CARD WITH STABILIZER AND DB VEHICLES */}
      <View style={styles.mapArea}>
        {currentStep !== 'POST_TRIP' && (
          <RealLocationMap
            style={StyleSheet.absoluteFill}
            pickupCoords={pickupCoords}
            dropCoords={destinationCoords}
            pickupAddress={pickupAddress || 'Your current location'}
            dropAddress={destinationAddress || 'Destination'}
            liveVehicles={liveVehicles}
            cityName={cityName}
            step={currentStep}
            carProgress={carProgress}
            distanceKm={distanceKm}
            onStabilize={handleStabilizeMap}
          />
        )}

        {/* Quick Places Chips when destination is not set */}
        {!destinationAddress && currentStep === 'HOME' && !isRideSheetOpen && (
          <View style={styles.quickPlacesOverlay}>
            <Text style={styles.quickPlacesLabel}>Popular Destinations:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickChipsScroll}
            >
              {savedPlaces.map((place) => (
                <TouchableOpacity
                  key={place.id}
                  activeOpacity={0.8}
                  onPress={() => handleSelectSavedPlace(place)}
                  style={styles.quickChip}
                >
                  <place.icon size={13} color="#2563eb" style={{ marginRight: 5 }} />
                  <Text style={styles.quickChipText}>{place.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* "CHOOSE A DRIVER" BUTTON (CITYLINKS ROYAL BLUE THEME) */}
        {destinationAddress.trim().length > 0 && currentStep === 'HOME' && !isRideSheetOpen && (
          <View style={styles.chooseRideFloatingWrapper}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleOpenRideSheet}
              style={styles.chooseRideMainBtn}
            >
              <View style={styles.chooseRideBtnLeft}>
                <View style={styles.chooseRideIconBubble}>
                  <Car size={22} color="#ffffff" />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.chooseRideBtnTitle}>Choose a Driver</Text>
                  </View>
                </View>
              </View>
              <View style={styles.chooseRideBtnRight}>
                <Text style={styles.chooseRideBtnActionText}>View</Text>
                <ChevronRight size={18} color="#ffffff" />
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 3. "CHOOSE A DRIVER" SECTION (MOVABLE BOTTOM SHEET - PULL-UP & PULL-DOWN) */}
      {bottomNavTab === 'home' && isRideSheetOpen && currentStep === 'HOME' && (
        <Animated.View
          style={[styles.rideSheetContainer, { height: chooseDriverAnimatedHeight }]}
        >
          {/* MOVABLE TOP GRAY DRAG BAR (Pull up for full list, pull down to reveal map) */}
          <View {...chooseDriverPanResponder.panHandlers} style={styles.dragHandleTouchArea}>
            <View style={styles.dragHandle} />
            <View style={styles.dragHintRow}>
              {chooseDriverStage === 'expanded' ? (
                <ChevronDown size={13} color="#64748b" />
              ) : (
                <ChevronUp size={13} color="#64748b" />
              )}
              <Text style={styles.dragHintText}>
                {chooseDriverStage === 'expanded'
                  ? 'Pull down to view map'
                  : chooseDriverStage === 'peek'
                  ? 'Pull up to choose a driver'
                  : 'Pull up for full list • Pull down for map'}
              </Text>
            </View>
          </View>

          {/* Header Row with "View Map" collapse button */}
          <View style={styles.rideSheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rideSheetTitle}>Choose a Driver</Text>
              <Text style={styles.rideSheetSub} numberOfLines={1}>
                To: {destinationAddress || 'Destination'} ({distanceKm} km)
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleToggleViewMap}
              style={styles.closeSheetBtn}
            >
              <Text style={styles.closeSheetBtnText}>
                {chooseDriverStage === 'peek' ? 'View Drivers' : 'View Map'}
              </Text>
              {chooseDriverStage === 'peek' ? (
                <ChevronUp size={16} color="#0f172a" />
              ) : (
                <ChevronDown size={16} color="#0f172a" />
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.rideSheetScroll}
            contentContainerStyle={styles.rideSheetScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Displaying all nearby drivers with their price per km */}
            <RideOptionsSheet
              drivers={nearbyDrivers}
              selectedDriverId={activeBooking?.driverId}
              onSelectDriver={handleSelectDriver}
              distanceKm={distanceKm}
              routes={availableRoutes}
              selectedRouteId={selectedRouteId}
              onTrackGoogleMaps={handleOpenGoogleMaps}
              onSelectRoute={(rtId) => {
                setSelectedRouteId(rtId);
                const rt = availableRoutes.find((r) => r.id === rtId);
                if (rt) {
                  setDistanceKm(rt.distanceKm);
                }
              }}
              onActionPress={(action) => {
                if (action === 'prices') {
                  showSuccess(
                    `Rate: ₹${selectedDriver?.ratePerKm || nearbyDrivers[0]?.ratePerKm || 20}/km • Base Price: ₹${selectedDriver?.baseFare || nearbyDrivers[0]?.baseFare || 30}`,
                    'Rate Breakdown'
                  );
                }
              }}
            />

            {/* Instant Book Button (CityLinks Signature Blue) */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleStartBooking}
              style={styles.bookConfirmBtn}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.bookConfirmTitle}>
                  Instant Book with {nearbyDrivers[0]?.name || 'Driver'} • ₹{nearbyDrivers[0]?.ratePerKm || 20}/km
                </Text>
                <Text style={styles.bookConfirmSub}>
                  {distanceKm} km • Rate: ₹{nearbyDrivers[0]?.ratePerKm || 20}/km • Pay after ride
                </Text>
              </View>
              <ChevronRight size={22} color="#ffffff" />
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      )}

      {/* 4. DRIVER & VEHICLE DETAILS STEP (REQUEST BUTTON, WAITING BANNER, OTP DISPLAY ONLY ON APPROVAL) */}
      {bottomNavTab === 'home' && currentStep === 'DRIVER_ACCEPTED' && (
        <DriverStatusSheet
          bookingId={activeBooking?.id}
          driverName={activeBooking?.driverName || selectedDriver?.name || nearbyDrivers[0]?.name || 'Karthik R.'}
          driverCar={activeBooking?.driverCar || selectedDriver?.driverCar || nearbyDrivers[0]?.driverCar || 'White Toyota Corolla'}
          driverPlate={activeBooking?.driverPlate || selectedDriver?.driverPlate || nearbyDrivers[0]?.driverPlate || 'KA 03 AB 1234'}
          driverImage={activeBooking?.image || selectedDriver?.image || nearbyDrivers[0]?.image || RIDE_ASSETS.driver}
          driverPhone={activeBooking?.driverPhone || selectedDriver?.phone || nearbyDrivers[0]?.phone || '9876543210'}
          driverLocation={activeBooking?.location || selectedDriver?.location || nearbyDrivers[0]?.location || 'Ashwini Nagar, Haveri'}
          ratePerKm={activeBooking?.ratePerKm || selectedDriver?.ratePerKm || nearbyDrivers[0]?.ratePerKm || 22}
          baseFare={activeBooking?.baseFare || selectedDriver?.baseFare || nearbyDrivers[0]?.baseFare || 40}
          totalFare={activeBooking?.totalFare || activeBooking?.fare || 140}
          distanceKm={activeBooking?.distanceKm || distanceKm}
          otp={activeBooking?.otp || null}
          vehicleType={activeBooking?.vehicleType || selectedDriver?.vehicleType || nearbyDrivers[0]?.vehicleType || 'Car'}
          pickupAddress={pickupAddress}
          destinationAddress={destinationAddress}
          bookingStatus={bookingStatus}
          isOtpVerified={isOtpVerified}
          onRequestRide={handleRequestRide}
          isRequesting={isRequestingRide}
          canCancel={canCancel}
          cancelSecondsRemaining={cancelSecondsRemaining}
          onTrackGoogleMaps={() => handleOpenGoogleMaps(activeBooking || selectedDriver || nearbyDrivers[0])}
          onCall={handleCallDriver}
          onStartRide={handleStartOngoingRide}
          onCancel={handleCancelRide}
          onChangeDriver={() => {
            setCurrentStep('HOME');
            handleOpenRideSheet();
          }}
        />
      )}

      {/* 5. ONGOING RIDE STEP */}
      {bottomNavTab === 'home' && currentStep === 'ONGOING_RIDE' && (
        <OngoingRideSheet
          onEmergencyPress={handleEmergencyPoliceCall}
          onCompleteRide={handleCompleteRide}
          isDestinationReached={isDestinationReached}
          driverName={activeBooking?.driverName || selectedDriver?.name || 'Driver'}
          ratePerKm={activeBooking?.ratePerKm || selectedDriver?.ratePerKm || 20}
          baseFare={activeBooking?.baseFare || selectedDriver?.baseFare || 30}
          totalFare={activeBooking?.totalFare || activeBooking?.fare || 140}
          destinationAddress={destinationAddress}
          isCompleting={isCompletingRide}
        />
      )}

      {/* 6. POST-TRIP RATING SHEET */}
      {bottomNavTab === 'home' && currentStep === 'POST_TRIP' && (
        <PostTripRatingSheet
          ratePerKm={activeBooking?.ratePerKm || selectedDriver?.ratePerKm || 20}
          baseFare={activeBooking?.baseFare || selectedDriver?.baseFare || 30}
          fareAmount={`₹${activeBooking?.ratePerKm || selectedDriver?.ratePerKm || 20}/km`}
          driverRating={driverRating}
          setDriverRating={setDriverRating}
          feedbackText={feedbackText}
          setFeedbackText={setFeedbackText}
          paymentMethod="Cash / UPI"
          driverImage={RIDE_ASSETS.driver}
          onSubmit={handleSubmitPostTrip}
        />
      )}

      {/* 6.5. PASSENGER RIDES OVERLAY (ONGOING RIDE & RIDE HISTORY) */}
      {bottomNavTab === 'rides' && (
        <View style={styles.passengerRidesOverlay}>
          {/* Header */}
          <SafeAreaView edges={['top']} style={{ backgroundColor: '#ffffff' }}>
            <View style={styles.passengerRidesHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.passengerRidesTitle}>My Rides & Trips</Text>
                <Text style={styles.passengerRidesSub}>
                  Live active ride tracking & completed trip history
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={fetchMyRides}
                  disabled={loadingMyRides}
                  style={styles.ridesRefreshBtn}
                  accessibilityLabel="Refresh Rides"
                >
                  {loadingMyRides ? (
                    <ActivityIndicator size="small" color="#2563eb" />
                  ) : (
                    <RefreshCw size={17} color="#2563eb" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setBottomNavTab('home')}
                  style={styles.ridesCloseBtn}
                  accessibilityLabel="Close Rides"
                >
                  <X size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sub-Tabs: Ongoing Ride vs Trip History */}
            <View style={styles.ridesSubTabRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setRidesSheetSubTab('ongoing')}
                style={[
                  styles.ridesSubTabBtn,
                  ridesSheetSubTab === 'ongoing' && styles.ridesSubTabBtnActive,
                ]}
              >
                <Car size={16} color={ridesSheetSubTab === 'ongoing' ? '#2563eb' : '#64748b'} />
                <Text
                  style={[
                    styles.ridesSubTabText,
                    ridesSheetSubTab === 'ongoing' && styles.ridesSubTabTextActive,
                  ]}
                >
                  Ongoing Ride
                </Text>
                {(passengerActiveRides.length > 0 || (activeBooking?.id && bookingStatus !== 'IDLE')) && (
                  <View style={styles.ridesCountPill}>
                    <Text style={styles.ridesCountPillText}>1</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setRidesSheetSubTab('history')}
                style={[
                  styles.ridesSubTabBtn,
                  ridesSheetSubTab === 'history' && styles.ridesSubTabBtnActive,
                ]}
              >
                <Clock size={16} color={ridesSheetSubTab === 'history' ? '#2563eb' : '#64748b'} />
                <Text
                  style={[
                    styles.ridesSubTabText,
                    ridesSheetSubTab === 'history' && styles.ridesSubTabTextActive,
                  ]}
                >
                  Trip History ({passengerHistoryRides.length})
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Content Scroll View */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 36 }}
            showsVerticalScrollIndicator={false}
          >
            {ridesSheetSubTab === 'ongoing' ? (
              /* ONGOING RIDE VIEW */
              (passengerActiveRides.length > 0 || (activeBooking?.id && bookingStatus !== 'IDLE')) ? (
                (() => {
                  const currentActive = passengerActiveRides[0] || activeBooking;
                  const st = currentActive?.status || bookingStatus;
                  const isCancelled = st === 'CANCELLED' || st === 'REJECTED';
                  const isAccepted = st === 'ACCEPTED' || st === 'APPROVED';
                  const isOngoing = st === 'ONGOING';
                  const isReached = st === 'DESTINATION_REACHED';
                  const isRequested = st === 'REQUESTED' || st === 'PENDING' || (!isAccepted && !isOngoing && !isReached && !isCancelled);

                  let statusBadgeText = 'Searching Driver Nearby...';
                  let statusBg = '#fef3c7';
                  let statusTextColor = '#92400e';
                  if (isCancelled) {
                    statusBadgeText = 'Ride Request Cancelled';
                    statusBg = '#ffe4e6';
                    statusTextColor = '#e11d48';
                  } else if (isAccepted) {
                    statusBadgeText = 'Driver Assigned & En Route';
                    statusBg = '#dcfce7';
                    statusTextColor = '#15803d';
                  } else if (isOngoing) {
                    statusBadgeText = 'Ride in Progress';
                    statusBg = '#e0f2fe';
                    statusTextColor = '#0369a1';
                  } else if (isReached) {
                    statusBadgeText = 'Reached Destination';
                    statusBg = '#f3e8ff';
                    statusTextColor = '#7e22ce';
                  }

                  return (
                    <View style={styles.activeRideCard}>
                      {/* Status Banner */}
                      <View style={[styles.activeRideStatusBanner, { backgroundColor: statusBg }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[styles.pulsingStatusDot, { backgroundColor: statusTextColor }]} />
                          <Text style={[styles.activeRideStatusText, { color: statusTextColor }]}>
                            {statusBadgeText}
                          </Text>
                        </View>
                        <Text style={styles.activeRideBookingId}>
                          #{String(currentActive.id || '').slice(-6).toUpperCase() || 'LIVE'}
                        </Text>
                      </View>

                      {/* Safety OTP Card: Display ONLY when driver accepts the ride! */}
                      {isAccepted && currentActive.otp ? (
                        <View style={styles.otpBanner}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.otpBannerLabel}>START RIDE OTP</Text>
                            <Text style={styles.otpBannerCode}>{currentActive.otp}</Text>
                          </View>
                          <View style={styles.otpSafetyBadge}>
                            <ShieldCheck size={18} color="#16a34a" />
                            <Text style={styles.otpSafetyText}>Share only with driver</Text>
                          </View>
                        </View>
                      ) : isRequested ? (
                        <View style={styles.otpPendingBanner}>
                          <Clock size={16} color="#b45309" />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.otpPendingLabel}>WAITING FOR DRIVER APPROVAL</Text>
                            <Text style={styles.otpPendingSub}>
                              OTP will be revealed immediately after driver accepts your ride.
                            </Text>
                          </View>
                        </View>
                      ) : isCancelled ? (
                        <View style={styles.otpCancelledBanner}>
                          <AlertCircle size={16} color="#e11d48" />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.otpCancelledLabel}>RIDE CANCELLED</Text>
                            <Text style={styles.otpCancelledSub}>
                              This ride request was cancelled or declined. You can find another driver.
                            </Text>
                          </View>
                        </View>
                      ) : null}

                      {/* Driver & Vehicle Box */}
                      <View style={styles.ongoingDriverBox}>
                        <View style={styles.ongoingDriverAvatar}>
                          <Car size={22} color="#ffffff" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.ongoingDriverName}>
                            {currentActive.driverName || selectedDriver?.name || 'Driver'}
                          </Text>
                          <Text style={styles.ongoingDriverCar}>
                            {currentActive.driverCar || selectedDriver?.driverCar || 'Vehicle'}{' '}
                            {currentActive.driverPlate ? `• ${currentActive.driverPlate}` : ''}
                          </Text>
                          <Text style={styles.ongoingDriverRating}>
                            ⭐ {selectedDriver?.rating || 4.9} • Verified Partner
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.ongoingFareLabel}>Rate / KM</Text>
                          <Text style={styles.ongoingFareValue}>
                            ₹{currentActive.ratePerKm || 20}/km
                          </Text>
                          <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 1 }}>
                            Base: ₹{currentActive.baseFare || 30}
                          </Text>
                        </View>
                      </View>

                      {/* Route Timeline */}
                      <View style={styles.ongoingRouteBox}>
                        <View style={styles.routeItemRow}>
                          <View style={styles.routeDotGreen} />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.routePointLabel}>PICKUP LOCATION</Text>
                            <Text style={styles.routePointAddress} numberOfLines={2}>
                              {currentActive.pickupAddress || pickupAddress}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.routeConnectorLine} />

                        <View style={styles.routeItemRow}>
                          <View style={styles.routePinRed}>
                            <MapPin size={12} color="#ffffff" />
                          </View>
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.routePointLabel}>DESTINATION</Text>
                            <Text style={styles.routePointAddress} numberOfLines={2}>
                              {currentActive.destinationAddress || destinationAddress}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Action Buttons Row */}
                      <View style={styles.ongoingActionsRow}>
                        {isCancelled ? (
                          <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => {
                              handleResetToHome();
                              setBottomNavTab('home');
                              setIsRideSheetOpen(true);
                            }}
                            style={styles.findAnotherRideBtn}
                          >
                            <RotateCcw size={15} color="#ffffff" />
                            <Text style={styles.findAnotherRideBtnText}>Book Another Ride</Text>
                          </TouchableOpacity>
                        ) : (
                          <>
                            {/* Call Driver */}
                            {(currentActive.driverPhone || selectedDriver?.phone) ? (
                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() =>
                                  Linking.openURL(`tel:${currentActive.driverPhone || selectedDriver?.phone}`)
                                }
                                style={styles.ongoingActionBtnCall}
                              >
                                <Phone size={15} color="#ffffff" />
                                <Text style={styles.ongoingActionBtnCallText}>Call</Text>
                              </TouchableOpacity>
                            ) : null}

                            {/* Track on Map */}
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => {
                                setBottomNavTab('home');
                                if (isOngoing || isReached) {
                                  setCurrentStep('ONGOING_RIDE');
                                } else if (isAccepted || isRequested) {
                                  setCurrentStep('DRIVER_ACCEPTED');
                                }
                              }}
                              style={styles.ongoingActionBtnTrack}
                            >
                              <Navigation size={15} color="#2563eb" />
                              <Text style={styles.ongoingActionBtnTrackText}>Track Map</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>

                      {/* Cancel Ride Option */}
                      {!isCancelled && !isOngoing && !isReached && (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={handleCancelRide}
                          style={styles.ongoingCancelLink}
                        >
                          <Text style={styles.ongoingCancelLinkText}>
                            Cancel this Ride {canCancel && cancelSecondsRemaining > 0 ? `(${cancelSecondsRemaining}s free)` : ''}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })()
              ) : (
                /* EMPTY STATE FOR ONGOING RIDE */
                <View style={styles.emptyOngoingBox}>
                  <View style={styles.emptyOngoingIconCircle}>
                    <Car size={36} color="#94a3b8" />
                  </View>
                  <Text style={styles.emptyOngoingTitle}>No Active Rides</Text>
                  <Text style={styles.emptyOngoingSubtitle}>
                    You do not have any ride in progress right now. Search your destination and pick a cab to request a ride!
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      setBottomNavTab('home');
                      setIsRideSheetOpen(true);
                    }}
                    style={styles.emptyBookNowBtn}
                  >
                    <Text style={styles.emptyBookNowBtnText}>Find a Ride Now</Text>
                  </TouchableOpacity>
                </View>
              )
            ) : (
              /* RIDE HISTORY VIEW */
              passengerHistoryRides.length > 0 ? (
                <View style={{ gap: 12 }}>
                  {passengerHistoryRides.map((trip: any) => {
                    const isCompleted = trip.status === 'COMPLETED';
                    const dateFormatted = trip.createdAt
                      ? new Date(trip.createdAt).toLocaleDateString([], {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Past Trip';

                    return (
                      <View key={trip.id} style={styles.historyTripCard}>
                        {/* Top row: Status pill + Date + Fare */}
                        <View style={styles.historyCardTopRow}>
                          <View
                            style={[
                              styles.historyStatusPill,
                              isCompleted ? styles.statusCompleted : styles.statusCancelled,
                            ]}
                          >
                            <Text
                              style={[
                                styles.historyStatusPillText,
                                isCompleted
                                  ? styles.statusCompletedText
                                  : styles.statusCancelledText,
                              ]}
                            >
                              {isCompleted ? '✓ Completed' : '✕ Cancelled'}
                            </Text>
                          </View>
                          <Text style={styles.historyDateText}>{dateFormatted}</Text>
                          <Text style={styles.historyFareText}>₹{trip.ratePerKm || 20}/km (Base ₹{trip.baseFare || 30})</Text>
                        </View>

                        {/* Route display */}
                        <View style={styles.historyRouteBox}>
                          <View style={styles.historyRoutePointRow}>
                            <View style={styles.historyPickupDot} />
                            <Text style={styles.historyRouteText} numberOfLines={1}>
                              {trip.pickupAddress || 'Pickup Point'}
                            </Text>
                          </View>
                          <View style={styles.historyRouteLine} />
                          <View style={styles.historyRoutePointRow}>
                            <View style={styles.historyDropPin}>
                              <MapPin size={10} color="#ffffff" />
                            </View>
                            <Text style={styles.historyRouteText} numberOfLines={1}>
                              {trip.destinationAddress || 'Destination'}
                            </Text>
                          </View>
                        </View>

                        {/* Driver & Book Again Row */}
                        <View style={styles.historyCardBottomRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.historyDriverName} numberOfLines={1}>
                              {trip.driverName || 'Driver'} • {trip.driverCar || 'Vehicle'}
                            </Text>
                            <Text style={styles.historyDistanceText}>
                              {trip.distanceKm ? `${trip.distanceKm} km trip` : 'City Transport'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => handleBookAgain(trip)}
                            style={styles.bookAgainBtn}
                          >
                            <RotateCcw size={14} color="#2563eb" />
                            <Text style={styles.bookAgainBtnText}>Book Again</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                /* EMPTY STATE FOR RIDE HISTORY */
                <View style={styles.emptyOngoingBox}>
                  <View style={styles.emptyOngoingIconCircle}>
                    <Clock size={36} color="#94a3b8" />
                  </View>
                  <Text style={styles.emptyOngoingTitle}>No Past Trips Found</Text>
                  <Text style={styles.emptyOngoingSubtitle}>
                    When you take trips with CityLinks Transport, your complete history, receipts, and invoices will show up here.
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      setBottomNavTab('home');
                      setIsRideSheetOpen(true);
                    }}
                    style={styles.emptyBookNowBtn}
                  >
                    <Text style={styles.emptyBookNowBtnText}>Start First Ride</Text>
                  </TouchableOpacity>
                </View>
              )
            )}
          </ScrollView>
        </View>
      )}

      {/* 7. CLEAN WHITE & BLUE BOTTOM NAVIGATION BAR (MATCHING HOME PAGE) */}
      <View style={styles.lightBottomNavBar}>
        {/* Home Tab */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            setBottomNavTab('home');
            setCurrentStep('HOME');
            setIsRideSheetOpen(false);
          }}
          style={styles.lightBottomNavItem}
        >
          <Home size={22} color={bottomNavTab === 'home' ? '#2563eb' : '#64748b'} />
          <Text
            style={[
              styles.lightBottomNavLabel,
              bottomNavTab === 'home' && styles.lightBottomNavLabelActive,
            ]}
          >
            Home
          </Text>
          {bottomNavTab === 'home' && <View style={styles.activeUnderline} />}
        </TouchableOpacity>

        {/* Search Tab */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            setBottomNavTab('search');
            handleDestinationSubmit();
          }}
          style={styles.lightBottomNavItem}
        >
          <Search size={22} color={bottomNavTab === 'search' ? '#2563eb' : '#64748b'} />
          <Text
            style={[
              styles.lightBottomNavLabel,
              bottomNavTab === 'search' && styles.lightBottomNavLabelActive,
            ]}
          >
            Search
          </Text>
        </TouchableOpacity>

        {/* Rides Tab */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleRidesTabPress}
          style={styles.lightBottomNavItem}
        >
          <View style={{ position: 'relative' }}>
            <Car size={22} color={bottomNavTab === 'rides' ? '#2563eb' : '#64748b'} />
            {(passengerActiveRides.length > 0 || (activeBooking?.id && bookingStatus !== 'IDLE')) && (
              <View style={styles.ridesActiveBadgeDot} />
            )}
          </View>
          <Text
            style={[
              styles.lightBottomNavLabel,
              bottomNavTab === 'rides' && styles.lightBottomNavLabelActive,
            ]}
          >
            Rides
          </Text>
          {bottomNavTab === 'rides' && <View style={styles.activeUnderline} />}
        </TouchableOpacity>
      </View>

      {/* MODAL: EDIT / SELECT CITY (WHITE & BLUE) */}
      <Modal
        visible={cityModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCityModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Select City</Text>
                <Text style={styles.modalSub}>Choose or search your operational region</Text>
              </View>
              <TouchableOpacity
                onPress={() => setCityModalVisible(false)}
                style={styles.modalCloseCircle}
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* GPS Live Detect Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setCityModalVisible(false);
                handleAutoFetchLocation(false);
              }}
              style={styles.gpsDetectRow}
            >
              <View style={styles.gpsIconCircle}>
                <Crosshair size={18} color="#2563eb" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.gpsDetectTitle}>Use My Current GPS Location</Text>
                <Text style={styles.gpsDetectSub}>Accurate automatic city & street detection</Text>
              </View>
            </TouchableOpacity>

            {/* Search Input */}
            <TextInput
              style={styles.modalInputField}
              placeholder="Search city (e.g. Haveri, Bengaluru)..."
              placeholderTextColor="#94a3b8"
              value={citySearchQuery}
              onChangeText={setCitySearchQuery}
            />

            {/* Cities List */}
            <ScrollView style={{ maxHeight: 240, marginTop: 10 }}>
              {filteredCities.map((item) => {
                const isCurrent = cityName.toLowerCase() === item.name.toLowerCase();
                return (
                  <TouchableOpacity
                    key={item.name}
                    activeOpacity={0.7}
                    onPress={() => handleSelectCity(item.name)}
                    style={[styles.cityItemRow, isCurrent && styles.cityItemRowActive]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MapPin size={16} color={isCurrent ? '#2563eb' : '#64748b'} />
                      <Text style={[styles.cityItemName, isCurrent && styles.cityItemNameActive]}>
                        {item.name}
                      </Text>
                      {item.isHub && (
                        <View style={styles.hubBadge}>
                          <Text style={styles.hubBadgeText}>Hub</Text>
                        </View>
                      )}
                    </View>
                    {isCurrent && <Check size={18} color="#2563eb" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: ADD NEW SAVED PLACE */}
      <Modal
        visible={addNewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddNewModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Saved Place</Text>
            <Text style={styles.modalSub}>Bookmark an address for quick one-tap booking</Text>

            <TextInput
              style={styles.modalInputField}
              placeholder="Label (e.g. Airport, University)"
              placeholderTextColor="#94a3b8"
              value={newPlaceName}
              onChangeText={setNewPlaceName}
            />

            <TextInput
              style={styles.modalInputField}
              placeholder="Address / Street Name"
              placeholderTextColor="#94a3b8"
              value={newPlaceAddress}
              onChangeText={setNewPlaceAddress}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                onPress={() => setAddNewModalVisible(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (newPlaceName.trim() && newPlaceAddress.trim()) {
                    setDestinationAddress(newPlaceAddress.trim());
                    showSuccess(`Saved "${newPlaceName.trim()}"!`, 'Place Saved');
                    setAddNewModalVisible(false);
                    handleDestinationSubmit();
                  }
                }}
                style={styles.modalSaveBtn}
              >
                <Text style={styles.modalSaveBtnText}>Save & Set</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  // 1. TOP HEADER SECTION (White & Blue Theme)
  topHeaderSection: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    zIndex: 25,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 4,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
  },
  circularIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  centerCityPill: {
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    maxWidth: SCREEN_WIDTH * 0.55,
  },
  cityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cityNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  citySubText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
    marginTop: 1,
  },

  // 2. MAP AREA
  mapArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#ffffff',
  },

  // Quick Places Chips floating over the map
  quickPlacesOverlay: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  quickPlacesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
    marginLeft: 4,
    textShadowColor: 'rgba(255,255,255,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  quickChipsScroll: {
    gap: 8,
    paddingRight: 16,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },

  // CHOOSE A RIDE FLOATING BUTTON (CityLinks Signature Blue)
  chooseRideFloatingWrapper: {
    position: 'absolute',
    bottom: 74,
    left: 16,
    right: 16,
    zIndex: 20,
  },
  chooseRideMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2563eb', // Brand Royal Blue
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  chooseRideBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chooseRideIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chooseRideBtnTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  chooseRideBtnSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dbeafe',
    marginTop: 2,
  },
  chooseRideBtnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 4,
  },
  chooseRideBtnActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },

  // 3. CHOOSE A RIDE SECTION (BOTTOM SHEET - WHITE & BLUE)
  rideSheetContainer: {
    position: 'absolute',
    bottom: 64,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 30,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    overflow: 'hidden',
  },
  dragHandleTouchArea: {
    width: '100%',
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  dragHandle: {
    width: 48,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#94a3b8',
    marginBottom: 4,
  },
  dragHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dragHintText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  rideSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rideSheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  rideSheetSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 1,
  },
  closeSheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  closeSheetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  rideSheetScroll: {
    flexGrow: 0,
  },
  rideSheetScrollContent: {
    paddingBottom: 60,
  },

  // Confirm Booking Button (CityLinks Signature Blue)
  bookConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2563eb',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bookConfirmTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  bookConfirmSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#bfdbfe',
    marginTop: 2,
  },

  // 7. CLEAN WHITE & BLUE BOTTOM NAVIGATION BAR
  lightBottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: Platform.OS === 'ios' ? 12 : 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 35,
  },
  lightBottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    position: 'relative',
  },
  lightBottomNavLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 3,
  },
  lightBottomNavLabelActive: {
    color: '#2563eb',
    fontWeight: '800',
  },
  activeUnderline: {
    width: 20,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#2563eb',
    position: 'absolute',
    bottom: -6,
  },

  // MODALS (WHITE & BLUE)
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsDetectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 16,
    marginTop: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  gpsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  gpsDetectTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  gpsDetectSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#2563eb',
    marginTop: 1,
  },
  modalInputField: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
    marginTop: 10,
  },
  cityItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cityItemRowActive: {
    backgroundColor: '#eff6ff',
  },
  cityItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginLeft: 10,
  },
  cityItemNameActive: {
    color: '#1d4ed8',
    fontWeight: '800',
  },
  hubBadge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 8,
  },
  hubBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  modalSaveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  chatModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },

  // AUTHENTIC WHATSAPP CHAT MODAL STYLES (#075E54 & #EFEAE2)
  waModalContainer: {
    backgroundColor: '#efeae2',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  waHeader: {
    backgroundColor: '#075e54',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  waHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  waHeaderBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  waAvatarContainer: {
    position: 'relative',
  },
  waAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#054c44',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  waOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#25D366',
    borderWidth: 2,
    borderColor: '#075e54',
  },
  waHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  waHeaderSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#a7f3d0',
    marginTop: 1,
  },
  waHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waHeaderIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff3cd',
    borderBottomWidth: 1,
    borderBottomColor: '#ffeeba',
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  waNoticeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#856404',
    textAlign: 'center',
  },
  waMessagesScroll: {
    flex: 1,
    backgroundColor: '#efeae2',
  },
  waEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
    paddingHorizontal: 24,
  },
  waEmptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  waEmptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
  },
  waEmptySubtitle: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 280,
  },
  waBubbleRow: {
    marginBottom: 8,
    maxWidth: '84%',
  },
  waBubbleRowMe: {
    alignSelf: 'flex-end',
  },
  waBubbleRowOther: {
    alignSelf: 'flex-start',
  },
  waBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  waBubbleMe: {
    backgroundColor: '#dcf8c6',
    borderTopRightRadius: 2,
  },
  waBubbleOther: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  waSenderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#075e54',
    marginBottom: 2,
  },
  waMessageText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
    lineHeight: 19,
  },
  waMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
    gap: 4,
  },
  waTimeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  waCheckmark: {
    fontSize: 11,
    fontWeight: '800',
    color: '#34b7f1',
  },
  waChipsContainer: {
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  waChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  waChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  waInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  waInputWrapper: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  waTextInput: {
    fontSize: 14,
    color: '#0f172a',
    paddingVertical: 8,
  },
  waSendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  waSendBtnDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },

  // PASSENGER RIDES OVERLAY (ONGOING RIDE & RIDE HISTORY)
  passengerRidesOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 64,
    left: 0,
    right: 0,
    backgroundColor: '#f8fafc',
    zIndex: 60,
    elevation: 30,
  },
  passengerRidesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  passengerRidesTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  passengerRidesSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 1,
  },
  ridesRefreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  ridesCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ridesSubTabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  ridesSubTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  ridesSubTabBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  ridesSubTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  ridesSubTabTextActive: {
    color: '#2563eb',
    fontWeight: '800',
  },
  ridesCountPill: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  ridesCountPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ffffff',
  },

  // Ongoing Ride Card
  activeRideCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  activeRideStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pulsingStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeRideStatusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  activeRideBookingId: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  otpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#dcfce7',
  },
  otpBannerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
    letterSpacing: 0.5,
  },
  otpBannerCode: {
    fontSize: 22,
    fontWeight: '900',
    color: '#166534',
    letterSpacing: 2,
    marginTop: 2,
  },
  otpSafetyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  otpSafetyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803d',
  },
  otpPendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#fef3c7',
  },
  otpPendingLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#b45309',
    letterSpacing: 0.5,
  },
  otpPendingSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#92400e',
    marginTop: 2,
    lineHeight: 15,
  },
  otpCancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ffe4e6',
  },
  otpCancelledLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#e11d48',
    letterSpacing: 0.5,
  },
  otpCancelledSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#be123c',
    marginTop: 2,
    lineHeight: 15,
  },
  ongoingDriverBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  ongoingDriverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ongoingDriverName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  ongoingDriverCar: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 1,
  },
  ongoingDriverRating: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f59e0b',
    marginTop: 2,
  },
  ongoingFareLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  ongoingFareValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 1,
  },
  ongoingRouteBox: {
    padding: 14,
    backgroundColor: '#fafafa',
  },
  routeItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeDotGreen: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#16a34a',
    marginTop: 3,
  },
  routePinRed: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  routePointLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  routePointAddress: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 1,
  },
  routeConnectorLine: {
    width: 2,
    height: 16,
    backgroundColor: '#cbd5e1',
    marginLeft: 5,
    marginVertical: 2,
  },
  ongoingActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  ongoingActionBtnCall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 5,
  },
  ongoingActionBtnCallText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  ongoingActionBtnChat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dcf8c6',
    borderWidth: 1,
    borderColor: '#86efac',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 5,
  },
  ongoingActionBtnChatText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#075e54',
  },
  ongoingActionBtnTrack: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 5,
  },
  ongoingActionBtnTrackText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563eb',
  },
  ongoingCancelLink: {
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  ongoingCancelLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  findAnotherRideBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  findAnotherRideBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },

  // Empty ongoing view
  emptyOngoingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyOngoingIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyOngoingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e293b',
  },
  emptyOngoingSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    maxWidth: 290,
  },
  emptyBookNowBtn: {
    marginTop: 18,
    backgroundColor: '#2563eb',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 14,
  },
  emptyBookNowBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },

  // History Card
  historyTripCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  historyCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  historyStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusCompleted: {
    backgroundColor: '#dcfce7',
  },
  statusCompletedText: {
    color: '#15803d',
  },
  statusCancelled: {
    backgroundColor: '#ffe4e6',
  },
  statusCancelledText: {
    color: '#e11d48',
  },
  historyStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  historyDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  historyFareText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  historyRouteBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  historyRoutePointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyPickupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16a34a',
  },
  historyDropPin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyRouteLine: {
    width: 2,
    height: 10,
    backgroundColor: '#cbd5e1',
    marginLeft: 3,
    marginVertical: 1,
  },
  historyRouteText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  historyCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyDriverName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  historyDistanceText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  bookAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    gap: 4,
  },
  bookAgainBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
  },

  // Active indicator dot on Rides tab
  ridesActiveBadgeDot: {
    position: 'absolute',
    top: -2,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16a34a',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
});
