import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import {
  ShieldAlert,
  CheckCircle2,
  Car,
} from 'lucide-react-native';

interface OngoingRideSheetProps {
  onEmergencyPress?: () => void;
  onCompleteRide: () => void;
  onMessage?: () => void;
  isDestinationReached?: boolean;
  driverName?: string;
  totalFare?: string | number;
  ratePerKm?: number;
  baseFare?: number;
  destinationAddress?: string;
  isCompleting?: boolean;
}

export const OngoingRideSheet: React.FC<OngoingRideSheetProps> = ({
  onEmergencyPress,
  onCompleteRide,
  onMessage,
  isDestinationReached = false,
  driverName = 'Driver',
  totalFare = '140',
  ratePerKm = 20,
  baseFare = 30,
  destinationAddress,
  isCompleting = false,
}) => {
  // Emergency SOS click: direct call to 100 (Indian Police)
  const handleSos = () => {
    if (onEmergencyPress) {
      onEmergencyPress();
    } else {
      Linking.openURL('tel:100').catch(() => {
        Alert.alert(
          'Emergency Assistance',
          'Unable to auto-dial. Please call 100 directly on your phone.',
          [{ text: 'OK' }]
        );
      });
    }
  };

  return (
    <View style={styles.sheetContainer}>
      <View style={styles.dragHandle} />

      {/* Destination Reached Banner (When driver pressed Reached Destination) */}
      {isDestinationReached ? (
        <View style={styles.destinationReachedCard}>
          <View style={styles.reachedTitleRow}>
            <View style={styles.greenDotPulse} />
            <Text style={styles.reachedTitleText}>📍 Destination Reached!</Text>
          </View>
          <Text style={styles.reachedSubText}>
            {driverName} has safely dropped you off. Tap Complete Ride below.
          </Text>
          <View style={styles.farePayableRow}>
            <Text style={styles.farePayableLabel}>Pricing Details:</Text>
            <View style={styles.fareBadge}>
              <Text style={styles.fareBadgeText}>
                ₹{ratePerKm}/km (Base ₹{baseFare})
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.ongoingTripCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Car size={16} color="#2563eb" />
            <Text style={styles.ongoingTripTitle}>Ride In Progress</Text>
          </View>
          <Text style={styles.ongoingTripSub} numberOfLines={1}>
            Heading to: {destinationAddress || 'Destination'}
          </Text>
        </View>
      )}

      {/* Primary Action: Complete Ride Button */}
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onCompleteRide}
        disabled={isCompleting}
        style={[
          styles.completeBtn,
          isDestinationReached && styles.completeBtnHighlighted,
        ]}
      >
        {isCompleting ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <>
            <CheckCircle2
              size={20}
              color={isDestinationReached ? '#ffffff' : '#2563eb'}
              style={{ marginRight: 8 }}
            />
            <Text
              style={[
                styles.completeBtnText,
                isDestinationReached && styles.completeBtnTextHighlighted,
              ]}
            >
              {isDestinationReached
                ? 'Complete Ride & Return to Transport'
                : 'Complete Ride (Reached Destination)'}
            </Text>
          </>
        )}
      </TouchableOpacity>



      {/* SOS / EMERGENCY Button -> Dials 100 (Indian Police) */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleSos}
        style={styles.sosBtn}
      >
        <ShieldAlert size={19} color="#ffffff" style={{ marginRight: 8 }} />
        <Text style={styles.sosBtnText}>SOS / CALL POLICE (100)</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingBottom: 75,
    justifyContent: 'center',
    gap: 12,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 4,
  },
  destinationReachedCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
    marginBottom: 2,
  },
  reachedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  greenDotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  reachedTitleText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#065f46',
  },
  reachedSubText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#047857',
    lineHeight: 16,
    marginBottom: 8,
  },
  farePayableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  farePayableLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  fareBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  fareBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
  },
  ongoingTripCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 2,
  },
  ongoingTripTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
  },
  ongoingTripSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 2,
  },
  completeBtn: {
    backgroundColor: '#eff6ff',
    borderRadius: 18,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeBtnHighlighted: {
    backgroundColor: '#16a34a',
    borderColor: '#15803d',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  completeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563eb',
  },
  completeBtnTextHighlighted: {
    color: '#ffffff',
    fontWeight: '900',
  },
  sosBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  sosBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  messageBtn: {
    backgroundColor: '#eff6ff',
    borderRadius: 18,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563eb',
  },
});
