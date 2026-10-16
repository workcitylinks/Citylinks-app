import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {
  MapPin,
  Crosshair,
  ArrowUpDown,
  X,
  Edit3,
  Search,
} from 'lucide-react-native';

interface PickupDropCardProps {
  pickupAddress: string;
  setPickupAddress: (val: string) => void;
  destinationAddress: string;
  setDestinationAddress: (val: string) => void;
  isLocating: boolean;
  onAutoFetchLocation: () => void;
  onSwapAddresses: () => void;
  onSubmitDestination?: () => void;
  onSubmitPickup?: () => void;
  isEditable?: boolean;
}

export const PickupDropCard: React.FC<PickupDropCardProps> = ({
  pickupAddress,
  setPickupAddress,
  destinationAddress,
  setDestinationAddress,
  isLocating,
  onAutoFetchLocation,
  onSwapAddresses,
  onSubmitDestination,
  onSubmitPickup,
  isEditable = true,
}) => {
  return (
    <View style={styles.cardContainer}>
      {/* ROW 1: PICKUP LOCATION */}
      <View style={styles.addressRow}>
        {/* Blue dot marker - matching CityLinks Blue */}
        <View style={styles.blueDotWrapper}>
          <View style={styles.blueDot} />
        </View>

        <View style={styles.inputCol}>
          <View style={styles.labelRow}>
            <Text style={styles.fieldLabel}>Pickup location</Text>
            <View style={styles.editableBadge}>
              <Edit3 size={11} color="#2563eb" />
              <Text style={styles.editableBadgeText}>Editable</Text>
            </View>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="Type or detect pickup location..."
            placeholderTextColor="#94a3b8"
            maxLength={120}
            value={pickupAddress}
            onChangeText={setPickupAddress}
            editable={isEditable}
            returnKeyType="done"
            onSubmitEditing={onSubmitPickup}
          />
        </View>

        {/* Clear input button if text exists */}
        {pickupAddress.length > 0 && isEditable && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setPickupAddress('')}
            style={styles.clearBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={15} color="#94a3b8" />
          </TouchableOpacity>
        )}

        {/* Auto-Fetch GPS Crosshair Button (White & Blue) */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onAutoFetchLocation}
          style={styles.autoFetchBtn}
          accessibilityLabel="Auto fetch current location"
        >
          {isLocating ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <Crosshair size={18} color="#2563eb" />
          )}
        </TouchableOpacity>
      </View>

      {/* DOTTED CONNECTOR & SWAP BUTTON */}
      <View style={styles.connectorRow}>
        <View style={styles.dottedLine}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onSwapAddresses}
          style={styles.swapBtn}
          accessibilityLabel="Swap pickup and drop locations"
        >
          <ArrowUpDown size={15} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* ROW 2: DESTINATION (WHERE TO?) */}
      <View style={styles.addressRow}>
        {/* Red pin marker */}
        <View style={styles.redPinWrapper}>
          <MapPin size={16} color="#ef4444" fill="#ef4444" />
        </View>

        <View style={styles.inputCol}>
          <Text style={styles.fieldLabel}>Where to?</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Search destination or drop point..."
            placeholderTextColor="#94a3b8"
            maxLength={120}
            value={destinationAddress}
            onChangeText={setDestinationAddress}
            onSubmitEditing={onSubmitDestination}
            returnKeyType="search"
            editable={isEditable}
          />
        </View>

        {/* Clear destination button if text exists */}
        {destinationAddress.length > 0 && isEditable && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setDestinationAddress('')}
            style={styles.clearBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={15} color="#94a3b8" />
          </TouchableOpacity>
        )}

        {/* Search button beside the destination typing input (CityLinks Blue Theme) */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onSubmitDestination}
          style={styles.searchDestinationBtn}
          accessibilityLabel="Search destination route"
        >
          <Search size={14} color="#ffffff" />
          <Text style={styles.searchDestinationBtnText}>Search</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 6,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  blueDotWrapper: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  blueDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 2,
  },
  redPinWrapper: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  inputCol: {
    flex: 1,
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  editableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  editableBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  textInput: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    padding: 0,
    margin: 0,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  autoFetchBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  connectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 10,
    paddingRight: 6,
    marginVertical: 2,
  },
  dottedLine: {
    gap: 3,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#93c5fd',
  },
  swapBtn: {
    padding: 5,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  searchDestinationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563eb', // CityLinks Signature Blue
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    marginLeft: 6,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  searchDestinationBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
});
