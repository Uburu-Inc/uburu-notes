import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { EyeIcon } from '../icons/eye';
import { EyeSlashIcon } from '../icons/eyeslash';
import {
  DANGER_COLOR,
  INPUT_BORDER_COLOR,
  STROKE_COLOR,
  SURFACE_COLOR,
} from '../../lib/theme';

interface Props extends Omit<TextInputProps, 'secureTextEntry'> {
  label: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function PasswordInputField({
  label,
  error,
  containerStyle,
  style,
  ...inputProps
}: Props) {
  const [hidden, setHidden] = useState(true);

  return (
    <View style={[styles.field, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error && styles.inputError]}>
        <TextInput
          placeholderTextColor={INPUT_BORDER_COLOR}
          secureTextEntry={hidden}
          style={[styles.input, style]}
          {...inputProps}
        />
        <View style={styles.divider} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          onPress={() => setHidden((value) => !value)}
          style={styles.toggle}>
          {hidden ? <EyeIcon /> : <EyeSlashIcon />}
        </Pressable>
      </View>
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
  inputRow: {
    alignItems: 'center',
    backgroundColor: SURFACE_COLOR,
    borderColor: INPUT_BORDER_COLOR,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
  },
  input: {
    color: STROKE_COLOR,
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  divider: {
    backgroundColor: INPUT_BORDER_COLOR,
    height: 24,
    width: 1,
  },
  toggle: {
    alignItems: 'center',
    justifyContent: 'center',
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
