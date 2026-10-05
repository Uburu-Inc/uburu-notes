import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { BORDER_COLOR, MUTED_TEXT_COLOR, STROKE_COLOR, SURFACE_COLOR } from '../../lib/theme';

interface Props {
  label: string;
  value: number;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** One summary number with its label, as on the web Home page. */
export function StatCard({ label, value, loading = false, style }: Props) {
  return (
    <View style={[styles.card, style]} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.label}>{label}</Text>
      {/* Held at the number's height, so the card does not jump when it loads. */}
      <View style={styles.valueSlot}>
        {loading ? (
          <ActivityIndicator color={MUTED_TEXT_COLOR} />
        ) : (
          <Text style={styles.value}>{value.toLocaleString()}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACE_COLOR,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  label: {
    color: MUTED_TEXT_COLOR,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  valueSlot: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    minHeight: 36,
  },
  value: {
    color: STROKE_COLOR,
    fontSize: 28,
    fontWeight: '700',
  },
});
