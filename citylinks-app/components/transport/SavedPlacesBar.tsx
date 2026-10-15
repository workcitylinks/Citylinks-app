import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  Home,
  Briefcase,
  Dumbbell,
  Coffee,
  ChevronRight,
} from 'lucide-react-native';

export interface SavedPlaceItem {
  id: string;
  label: string;
  subtitle: string;
  icon: any;
  bg: string;
  address: string;
}

export const getSavedPlacesForCity = (city: string = 'Current Area'): SavedPlaceItem[] => [
  { id: 'home', label: 'Home', subtitle: 'Saved', icon: Home, bg: '#2563eb', address: `Residential Layout, ${city}` },
  { id: 'work', label: 'Work', subtitle: 'Office', icon: Briefcase, bg: '#2563eb', address: `Tech Hub, Commercial Area, ${city}` },
  { id: 'station', label: 'Station', subtitle: 'Transit', icon: Dumbbell, bg: '#2563eb', address: `Railway & Bus Station, ${city}` },
  { id: 'market', label: 'Market', subtitle: 'Center', icon: Coffee, bg: '#2563eb', address: `Main City Market, ${city}` },
];

export const DEFAULT_SAVED_PLACES: SavedPlaceItem[] = getSavedPlacesForCity();

interface SavedPlacesBarProps {
  places?: SavedPlaceItem[];
  onSelectPlace: (place: SavedPlaceItem) => void;
  onAddNew: () => void;
}

export const SavedPlacesBar: React.FC<SavedPlacesBarProps> = ({
  places = DEFAULT_SAVED_PLACES,
  onSelectPlace,
  onAddNew,
}) => {
  return (
    <View style={styles.container}>
      {/* Header: Saved Places & Add New > */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Saved Places</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onAddNew}
          style={styles.addNewRow}
        >
          <Text style={styles.addNewText}>Add New</Text>
          <ChevronRight size={15} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* 4 Cards in a Row */}
      <View style={styles.cardsRow}>
        {places.slice(0, 4).map((place) => {
          const IconComp = place.icon;
          return (
            <TouchableOpacity
              key={place.id}
              activeOpacity={0.8}
              onPress={() => onSelectPlace(place)}
              style={styles.cardItem}
            >
              <View style={[styles.circleIcon, { backgroundColor: place.bg }]}>
                <IconComp size={20} color="#ffffff" />
              </View>
              <Text style={styles.label}>{place.label}</Text>
              <Text style={styles.subtitle}>{place.subtitle}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  addNewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  addNewText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardItem: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  circleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
    marginTop: 2,
  },
});
