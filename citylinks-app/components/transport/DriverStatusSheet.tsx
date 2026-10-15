import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import {
  Phone,
  Car,
  ShieldCheck,
  KeyRound,
  Navigation,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  Clock,
  Lock,
  MapPin,
  ExternalLink,
  Send,
  AlertCircle,
  Timer,
} from 'lucide-react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Default resting stage
const COLLAPSED_HEIGHT = Math.round(SCREEN_HEIGHT * 0.58);

// When pulled up, it goes right up till below the destination entering section
const EXPANDED_HEIGHT = Math.round(SCREEN_HEIGHT * 0.84);

export type RideBookingStatus =
  | 'IDLE'
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'ONGOING'
  | 'DESTINATION_REACHED'
  | 'COMPLETED'
  | 'CANCELLED';

interface DriverStatusSheetProps {
  bookingId?: string;
  driverName: string;
  driverCar: string;
  driverPlate: string;
  driverImage: any;
  driverPhone?: string;
  driverLocation?: string;
  ratePerKm?: number;
  baseFare?: number;
  totalFare?: string | number;
  distanceKm?: number;
  otp?: string | null;
  vehicleType?: string;
  pickupAddress?: string;
  destinationAddress?: string;
  bookingStatus?: RideBookingStatus;
  isOtpVerified?: boolean;
  onRequestRide?: () => void;
  isRequesting?: boolean;
  canCancel?: boolean;
  cancelSecondsRemaining?: number;
  onCall: () => void;
  onMessage?: () => void;
  onStartRide?: () => void;
  onCancel: () => void;
  onChangeDriver?: () => void;
  onTrackGoogleMaps?: () => void;
}

export const DriverStatusSheet: React.FC<DriverStatusSheetProps> = ({
  bookingId,
  driverName,
  driverCar,
  driverPlate,
  driverImage,
  driverPhone = '9876543210',
  driverLocation,
  ratePerKm = 22,
  baseFare = 40,
  totalFare = 140,
  distanceKm = 3.5,
  otp = null,
  vehicleType = 'Car',
  pickupAddress,
  destinationAddress,
  bookingStatus = 'IDLE',
  isOtpVerified = false,
  onRequestRide,
  isRequesting = false,
  canCancel = true,
  cancelSecondsRemaining = 60,
  onCall,
  onMessage,
  onStartRide,
  onCancel,
  onChangeDriver,
  onTrackGoogleMaps,
}) => {
  // Animated height for pull-up & pull-down
  const animatedHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const isExpandedRef = useRef(false);
  const [isExpandedState, setIsExpandedState] = useState(false);

  // Snap to expanded or collapsed stage
  const snapTo = (toExpanded: boolean) => {
    isExpandedRef.current = toExpanded;
    setIsExpandedState(toExpanded);
    Animated.spring(animatedHeight, {
      toValue: toExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
  };

  // PanResponder on the gray bar & drag area
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
      onPanResponderMove: (_, gesture) => {
        const startHeight = isExpandedRef.current ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
        const newHeight = startHeight - gesture.dy;
        if (newHeight >= COLLAPSED_HEIGHT - 30 && newHeight <= EXPANDED_HEIGHT + 20) {
          animatedHeight.setValue(newHeight);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -25 || gesture.vy < -0.5) {
          snapTo(true);
        } else if (gesture.dy > 25 || gesture.vy > 0.5) {
          snapTo(false);
        } else if (Math.abs(gesture.dy) < 8) {
          snapTo(!isExpandedRef.current);
        } else {
          snapTo(isExpandedRef.current);
        }
      },
    })
  ).current;

  // Status flags
  const isIdle = bookingStatus === 'IDLE';
  const isRequested = bookingStatus === 'REQUESTED';
  const isAccepted = bookingStatus === 'ACCEPTED';
  const isApprovedOrBeyond = isAccepted || bookingStatus === 'ONGOING' || isOtpVerified;

  // Formatting seconds for countdown display
  const formatTimer = (sec: number) => {
    const s = Math.max(0, sec);
    const m = Math.floor(s / 60);
    const remainingS = s % 60;
    return `${m}:${remainingS < 10 ? '0' : ''}${remainingS}`;
  };

  return (
    <Animated.View style={[styles.sheetContainer, { height: animatedHeight }]}>
      {/* 1. INTERACTIVE GRAY DRAG HANDLE BAR (PULL UP / PULL DOWN) */}
      <View {...panResponder.panHandlers} style={styles.dragHandleTouchArea}>
        <View style={styles.dragHandle} />
        <View style={styles.dragHintRow}>
          {isExpandedState ? (
            <ChevronDown size={14} color="#64748b" />
          ) : (
            <ChevronUp size={14} color="#64748b" />
          )}
          <Text style={styles.dragHintText}>
            {isExpandedState ? 'Pull down to collapse' : 'Pull up for full details'}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {/* TOP HEADER: STATUS / TITLE */}
        <View style={styles.headerRow}>
          {onChangeDriver && !isAccepted && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onChangeDriver}
              style={styles.backBtn}
              accessibilityLabel="Back to drivers list"
            >
              <ChevronLeft size={20} color="#1e293b" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetTitle}>
              {isIdle
                ? 'Review & Request Ride'
                : isRequested
                ? 'Waiting for Driver Approval'
                : 'Driver Confirmed & En Route'}
            </Text>
            <Text style={styles.sheetSubtitle}>
              {isIdle
                ? 'Selected driver • Tap Request Ride below'
                : isRequested
                ? `Request sent to ${driverName} • Awaiting response`
                : `${driverName} approved your ride! Share OTP upon arrival.`}
            </Text>
          </View>
          <View style={styles.verifiedBadge}>
            <ShieldCheck size={14} color="#2563eb" />
            <Text style={styles.verifiedBadgeText}>Verified</Text>
          </View>
        </View>

        {/* STATUS BANNER */}
        {isRequested && (
          <View style={styles.requestedNoticeCard}>
            <View className="flex-row items-center gap-2 mb-1">
              <View style={styles.pulseDot} />
              <Text style={styles.requestedNoticeTitle}>Ride Request Sent!</Text>
            </View>
            <Text style={styles.requestedNoticeText}>
              Waiting for {driverName} to approve your request in the driver dashboard.
            </Text>
            {canCancel && cancelSecondsRemaining > 0 ? (
              <View style={styles.timerBadge}>
                <Timer size={13} color="#b45309" />
                <Text style={styles.timerBadgeText}>
                  Cancel window: {formatTimer(cancelSecondsRemaining)} remaining
                </Text>
              </View>
            ) : (
              <View style={styles.timerExpiredBadge}>
                <AlertCircle size={13} color="#64748b" />
                <Text style={styles.timerExpiredText}>
                  1-min cancellation window expired. Waiting for driver response.
                </Text>
              </View>
            )}
          </View>
        )}

        {isAccepted && (
          <View style={styles.approvedNoticeCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <CheckCircle size={16} color="#15803d" />
              <Text style={styles.approvedNoticeTitle}>Ride Approved by {driverName}!</Text>
            </View>
            <Text style={styles.approvedNoticeText}>
              Driver is coming to pick you up. Please share the 4-digit OTP below when your driver arrives.
            </Text>
          </View>
        )}

        {/* 2. DRIVER DETAILS CARD */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeaderLabel}>DRIVER DETAILS</Text>
          <View style={styles.driverMainRow}>
            <View style={styles.avatarWrapper}>
              <Image source={driverImage} style={styles.avatar} />
              <View style={styles.onlineDotBadge}>
                <View style={styles.onlineInnerDot} />
              </View>
            </View>

            <View style={styles.driverCol}>
              <View style={styles.driverNameRow}>
                <Text style={styles.driverNameText}>{driverName}</Text>
                <CheckCircle size={15} color="#2563eb" style={{ marginLeft: 4 }} />
              </View>
              <Text style={styles.driverRoleText}>CityLinks Transport Partner</Text>
              <Text style={styles.driverPhoneText}>Ph: +91 {driverPhone}</Text>

              {/* Driver Location */}
              <View style={styles.driverLocationRow}>
                <MapPin size={12} color="#2563eb" />
                <Text style={styles.driverLocationText} numberOfLines={1}>
                  {driverLocation || 'Ashwini Nagar, Haveri'}
                </Text>
              </View>

              <View style={styles.ratePill}>
                <Text style={styles.ratePillText}>
                  Rate: <Text style={{ fontWeight: '900', color: '#1d4ed8' }}>₹{ratePerKm}/km</Text> • Base: <Text style={{ fontWeight: '900', color: '#1d4ed8' }}>₹{baseFare}</Text>
                </Text>
              </View>
            </View>
          </View>

          {/* Contact Button (Call Driver) */}
          <View style={styles.contactRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onCall}
              style={[styles.contactBtn, { flex: 1 }]}
            >
              <Phone size={16} color="#2563eb" />
              <Text style={styles.contactBtnText}>Call Driver</Text>
            </TouchableOpacity>
          </View>

          {/* Google Maps Live Track Connection */}
          {onTrackGoogleMaps && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onTrackGoogleMaps}
              style={styles.trackGoogleMapsBtn}
              accessibilityLabel="Track driver live on Google Maps"
            >
              <Navigation size={15} color="#1d4ed8" />
              <Text style={styles.trackGoogleMapsBtnText}>Track Driver Live on Google Maps</Text>
              <ExternalLink size={13} color="#1d4ed8" />
            </TouchableOpacity>
          )}
        </View>

        {/* 3. VEHICLE DETAILS CARD */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeaderLabel}>VEHICLE DETAILS</Text>
          <View style={styles.vehicleRow}>
            <View style={styles.vehicleIconCircle}>
              <Car size={22} color="#2563eb" />
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.vehicleModelText}>{driverCar}</Text>
              <Text style={styles.vehicleTypeText}>
                {vehicleType} • Air Conditioned • Inspected
              </Text>
            </View>

            {/* Indian Style Number Plate */}
            <View style={styles.numberPlateBox}>
              <View style={styles.plateIndStripe}>
                <Text style={styles.plateIndText}>IND</Text>
              </View>
              <Text style={styles.plateNumberText}>{driverPlate}</Text>
            </View>
          </View>

          {/* Feature Tags */}
          <View style={styles.vehicleFeaturesRow}>
            <View style={styles.featureChip}>
              <Text style={styles.featureChipText}>✓ Sanitized & Clean</Text>
            </View>
            <View style={styles.featureChip}>
              <Text style={styles.featureChipText}>✓ GPS Monitored</Text>
            </View>
            <View style={styles.featureChip}>
              <Text style={styles.featureChipText}>✓ Digital Meter</Text>
            </View>
          </View>
        </View>

        {/* 4. PRICING & OTP DETAILS (WITH PROPER OTP DISPLAY LOGIC) */}
        <View style={styles.fareSummaryCard}>
          <View style={styles.fareHeaderRow}>
            <View>
              <Text style={styles.fareTitleText}>Pricing Details</Text>
              <Text style={styles.fareFormulaSub}>
                Base Price: ₹{baseFare} • Est. Distance: {distanceKm} km
              </Text>
            </View>
            <View style={styles.totalFareBadge}>
              <Text style={styles.totalFareText}>
                ₹{ratePerKm}/km
              </Text>
            </View>
          </View>

          {/* Boarding OTP Box: Hidden during IDLE/REQUESTED, Revealed upon APPROVED/ACCEPTED */}
          {isApprovedOrBeyond && otp ? (
            <View style={styles.otpBox}>
              <View style={styles.otpLeft}>
                <KeyRound size={20} color="#2563eb" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.otpLabel}>START RIDE OTP</Text>
                  <Text style={styles.otpSub}>Share this 4-digit PIN with driver</Text>
                </View>
              </View>
              <View style={styles.otpCodeBadge}>
                <Text style={styles.otpCodeText}>{otp}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.otpLockedBox}>
              <Lock size={18} color="#64748b" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.otpLockedLabel}>OTP PROTECTED</Text>
                <Text style={styles.otpLockedSub}>
                  {isIdle
                    ? 'OTP will appear once you request and driver approves'
                    : 'OTP will be revealed immediately after driver accepts your ride'}
                </Text>
              </View>
            </View>
          )}

          {/* OTP Driver Status Banner */}
          {isApprovedOrBeyond ? (
            <View
              style={[
                styles.otpStatusBanner,
                isOtpVerified ? styles.otpStatusBannerVerified : styles.otpStatusBannerWaiting,
              ]}
            >
              {isOtpVerified ? (
                <>
                  <CheckCircle size={14} color="#15803d" />
                  <Text style={styles.otpStatusTextVerified}>
                    OTP Verified by Driver • Ride Ready to Begin
                  </Text>
                </>
              ) : (
                <>
                  <Lock size={14} color="#b45309" />
                  <Text style={styles.otpStatusTextWaiting}>
                    Driver will enter this OTP ({otp}) in their Transport Dashboard to start trip
                  </Text>
                </>
              )}
            </View>
          ) : null}

          {destinationAddress && (
            <View style={styles.routePreviewRow}>
              <Navigation size={13} color="#2563eb" style={{ marginTop: 2, marginRight: 6 }} />
              <Text style={styles.routePreviewText} numberOfLines={1}>
                To: {destinationAddress}
              </Text>
            </View>
          )}
        </View>

        {/* 5. FOOTER ACTION BUTTONS */}
        <View style={styles.footerActionCol}>
          {/* A: IDLE STATE -> "Request Ride to {driverName}" */}
          {isIdle && (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={onRequestRide}
              disabled={isRequesting}
              style={styles.requestRideBtn}
            >
              {isRequesting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Send size={18} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.requestRideBtnText}>
                    Request Ride to {driverName}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* B: REQUESTED STATE -> Waiting indicator */}
          {isRequested && (
            <View style={styles.waitingBtnDisabled}>
              <ActivityIndicator size="small" color="#d97706" style={{ marginRight: 8 }} />
              <Text style={styles.waitingBtnText}>Waiting for {driverName} to approve...</Text>
            </View>
          )}

          {/* C: ACCEPTED STATE -> Driver en route banner */}
          {isAccepted && (
            <View style={styles.driverEnRouteBtn}>
              <Car size={18} color="#1d4ed8" style={{ marginRight: 8 }} />
              <Text style={styles.driverEnRouteBtnText}>
                Driver En Route • Share OTP {otp} when boarding
              </Text>
            </View>
          )}

          {/* SECONDARY BUTTONS ROW */}
          <View style={styles.secondaryActionsRow}>
            {/* Choose another driver button: Allowed in IDLE and REQUESTED, but locked once ACCEPTED */}
            {!isAccepted && onChangeDriver && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onChangeDriver}
                style={styles.changeDriverBtn}
              >
                <Text style={styles.changeDriverBtnText}>Choose Another Driver</Text>
              </TouchableOpacity>
            )}

            {/* Cancel button: In IDLE cancels back; In REQUESTED or ACCEPTED enforces 1-min rule */}
            {isIdle ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onCancel}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Back</Text>
              </TouchableOpacity>
            ) : isRequested ? (
              canCancel && cancelSecondsRemaining > 0 ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onCancel}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>
                    Cancel Request ({formatTimer(cancelSecondsRemaining)})
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.cancelBtn, styles.cancelBtnDisabled]}>
                  <Text style={styles.cancelBtnTextDisabled}>Cancel Locked (&gt;1 min)</Text>
                </View>
              )
            ) : isAccepted ? (
              canCancel && cancelSecondsRemaining > 0 ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onCancel}
                  style={[styles.cancelBtn, { flex: 1 }]}
                >
                  <Text style={styles.cancelBtnText}>
                    Cancel Ride ({formatTimer(cancelSecondsRemaining)} left)
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.cancelBtn, styles.cancelBtnDisabled, { flex: 1 }]}>
                  <Text style={styles.cancelBtnTextDisabled}>
                    Ride Locked • Cannot cancel en route
                  </Text>
                </View>
              )
            ) : null}
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    bottom: 64, // Positioned right above bottom navigation bar
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 35,
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
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 30,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    gap: 4,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1d4ed8',
  },

  // Notice banners
  requestedNoticeCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#fde68a',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d97706',
  },
  requestedNoticeTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#92400e',
  },
  requestedNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78350f',
    marginTop: 2,
    lineHeight: 16,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    backgroundColor: '#fef9c3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  timerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400e',
  },
  timerExpiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  timerExpiredText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748b',
  },
  approvedNoticeCard: {
    backgroundColor: '#dcfce7',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
  },
  approvedNoticeTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#166534',
  },
  approvedNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803d',
    lineHeight: 16,
  },

  // Cards
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  driverMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
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
  driverCol: {
    flex: 1,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  driverRoleText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 1,
  },
  driverPhoneText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginTop: 1,
  },
  driverLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  driverLocationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  ratePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginTop: 3,
  },
  ratePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e293b',
  },

  // Contact Row
  contactRow: {
    flexDirection: 'row',
    gap: 8,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    gap: 5,
  },
  contactBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  trackGoogleMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    marginTop: 8,
    gap: 6,
  },
  trackGoogleMapsBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1d4ed8',
  },

  // Vehicle Details
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  vehicleModelText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  vehicleTypeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 1,
  },
  numberPlateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ca8a04',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#fef08a',
  },
  plateIndStripe: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 3,
    paddingVertical: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plateIndText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#ffffff',
  },
  plateNumberText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0f172a',
    paddingHorizontal: 5,
    paddingVertical: 3,
    letterSpacing: 0.5,
  },
  vehicleFeaturesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  featureChip: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  featureChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },

  // Fare & OTP Card
  fareSummaryCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
  },
  fareHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fareTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  fareFormulaSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
    marginTop: 1,
  },
  totalFareBadge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  totalFareText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
  },

  // OTP Box (Revealed)
  otpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: '#2563eb',
  },
  otpLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  otpLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  otpSub: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748b',
  },
  otpCodeBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  otpCodeText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1d4ed8',
    letterSpacing: 3,
  },

  // OTP Box (Locked/Masked)
  otpLockedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  otpLockedLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  otpLockedSub: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 1,
  },

  otpStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 8,
  },
  otpStatusBannerWaiting: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  otpStatusBannerVerified: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  otpStatusTextWaiting: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#92400e',
    flex: 1,
  },
  otpStatusTextVerified: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#15803d',
    flex: 1,
  },
  routePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#dbeafe',
  },
  routePreviewText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },

  // Footers
  footerActionCol: {
    gap: 8,
  },
  requestRideBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  requestRideBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
  },
  waitingBtnDisabled: {
    backgroundColor: '#fef3c7',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fde68a',
  },
  waitingBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#b45309',
  },
  driverEnRouteBtn: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
  },
  driverEnRouteBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  changeDriverBtn: {
    flex: 1,
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  changeDriverBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnDisabled: {
    backgroundColor: '#f8fafc',
    opacity: 0.6,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  cancelBtnTextDisabled: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
});
