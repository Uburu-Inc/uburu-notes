import {
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import {
  DANGER_COLOR,
  INPUT_BORDER_COLOR,
  STROKE_COLOR,
  SURFACE_COLOR,
} from '../../lib/theme';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function TextInputField({
  label,
  error,
  containerStyle,
  style,
  ...inputProps
}: Props) {
  return (
    <View style={[styles.field, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <RNTextInput
        placeholderTextColor={INPUT_BORDER_COLOR}
        style={[styles.input, error && styles.inputError, style]}
        {...inputProps}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 18,
  },
  label: {
    color: STROKE_COLOR,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    backgroundColor: SURFACE_COLOR,
    borderColor: INPUT_BORDER_COLOR,
    borderRadius: 8,
    borderWidth: 1,
    color: STROKE_COLOR,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: DANGER_COLOR,
  },
  errorText: {
    color: DANGER_COLOR,
    fontSize: 12,
    marginTop: 6,
  },
});
