import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
} from 'react-native';
import { CreditCard, Sparkles } from 'lucide-react-native';

interface PostTripRatingSheetProps {
  fareAmount?: string;
  ratePerKm?: number;
  baseFare?: number;
  driverRating: number;
  setDriverRating: (rating: number) => void;
  feedbackText: string;
  setFeedbackText: (text: string) => void;
  paymentMethod: string;
  driverImage: any;
  onSubmit: () => void;
}

export const PostTripRatingSheet: React.FC<PostTripRatingSheetProps> = ({
  fareAmount,
  ratePerKm = 20,
  baseFare = 30,
  driverRating,
  setDriverRating,
  feedbackText,
  setFeedbackText,
  paymentMethod,
  driverImage,
  onSubmit,
}) => {
  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.dragHandle} />

      {/* Top Pricing Card */}
      <View style={styles.fareCard}>
        <Text style={styles.fareAmount}>₹{ratePerKm}/km</Text>
        <Text style={styles.fareLabel}>Base Price: ₹{baseFare} • Rate per KM</Text>
        <View style={styles.divider} />
        <Text style={styles.completedStatus}>Trip Completed</Text>
      </View>

      {/* Trip Completed Feedback */}
      <Text style={styles.rateTitle}>TRIP COMPLETED</Text>

      {/* Driver preview */}
      <View style={styles.driverRow}>
        <Image source={driverImage} style={styles.driverAvatar} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.driverName}>Karthik R.</Text>
          <Text style={styles.driverVehicle}>
            White Toyota Corolla • KA 03 AB 1234
          </Text>
        </View>
      </View>

      {/* Quick Compliment Tags instead of stars */}
      <View style={styles.complimentsRow}>
        {['Safe Driver', 'Clean Vehicle', 'On Time', 'Polite'].map((tag) => (
          <View key={tag} style={styles.complimentPill}>
            <Text style={styles.complimentPillText}>✓ {tag}</Text>
          </View>
        ))}
      </View>

      {/* Feedback Textarea */}
      <TextInput
        style={styles.feedbackInput}
        placeholder="Optional: Leave Feedback..."
        placeholderTextColor="#94a3b8"
        value={feedbackText}
        onChangeText={setFeedbackText}
        multiline
        numberOfLines={3}
      />

      {/* Payment Method Pill */}
      <View style={styles.paymentBox}>
        <CreditCard size={18} color="#1e293b" style={{ marginRight: 10 }} />
        <Text style={styles.paymentText}>
          Payment: Paid via {paymentMethod}
        </Text>
      </View>

      {/* Submit & Close Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onSubmit}
        style={styles.submitBtn}
      >
        <Text style={styles.submitBtnText}>Submit & Close</Text>
        <Sparkles size={18} color="#ffffff" style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 85,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  fareCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  fareAmount: {
    fontSize: 42,
    fontWeight: '900',
    color: '#0a1d3f',
    letterSpacing: -0.5,
  },
  fareLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
    marginBottom: 10,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 10,
  },
  completedStatus: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: -0.2,
  },
  rateTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1d4ed8',
    textAlign: 'center',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  driverName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  driverVehicle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 1,
  },
  complimentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 10,
    marginBottom: 16,
  },
  complimentPill: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  complimentPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  feedbackInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    fontSize: 14,
    color: '#0f172a',
    height: 84,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  paymentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 18,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
});
