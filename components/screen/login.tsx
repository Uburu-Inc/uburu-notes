import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Spacer } from '../spacer';
import {
  ACCENT_COLOR,
  BORDER_COLOR,
  DANGER_COLOR,
  MUTED_TEXT_COLOR,
  STROKE_COLOR,
  SURFACE_COLOR,
} from '../../lib/theme';

// Deliberately loose: enough to catch a typo before submitting, without
// rejecting the addresses that a stricter pattern gets wrong.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

interface Props {
  /** Called with the entered email once the form validates. */
  onSignIn: (email: string) => void;
}

export function LoginComponent({ onSignIn }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Validation runs on submit rather than on every keystroke, so the form does
  // not shout at the user while they are still halfway through typing.
  const handleSubmit = () => {
    const nextErrors: typeof errors = {};

    if (!EMAIL_PATTERN.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address';
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // No auth backend yet — swap this for the real sign-in call and await it
    // before handing control back to the screen.
    onSignIn(email.trim());
  };

  const canSubmit = email.trim().length > 0 && password.length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <Spacer>
          <Text style={styles.title}>Uburu Notes</Text>
          <Text style={styles.subtitle}>Sign in to start writing.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={MUTED_TEXT_COLOR}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={MUTED_TEXT_COLOR}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}>
            <Text style={styles.buttonText}>Sign in</Text>
          </TouchableOpacity>
        </Spacer>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  title: {
    color: STROKE_COLOR,
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    color: MUTED_TEXT_COLOR,
    fontSize: 15,
    marginTop: 6,
    marginBottom: 28,
  },
  field: {
    marginBottom: 18,
  },
  label: {
    color: STROKE_COLOR,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: SURFACE_COLOR,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
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
  button: {
    alignItems: 'center',
    backgroundColor: ACCENT_COLOR,
    borderRadius: 12,
    marginTop: 10,
    paddingVertical: 15,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
