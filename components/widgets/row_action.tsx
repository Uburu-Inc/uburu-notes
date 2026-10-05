import { Pressable, StyleSheet, Text } from 'react-native';

import { BORDER_COLOR, STROKE_COLOR, SURFACE_COLOR } from '../../lib/theme';

interface Props {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}

/** A small outlined button for actions inside a list row or card. */
export function RowAction({ label, disabled = false, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    backgroundColor: SURFACE_COLOR,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: {
    color: STROKE_COLOR,
    fontSize: 13,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
});
