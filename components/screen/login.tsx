import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLogin } from '../../hooks/network-requests/login';
import { useKeyboardHeight } from '../../hooks/use_keyboard_height';

import { loginSchema, type LoginFormValues } from '../../lib/schemas/login';
import {
  DANGER_COLOR,
  LOGIN_BACKGROUND,
  MUTED_TEXT_COLOR,
  STROKE_COLOR,
  SURFACE_COLOR,
  UBURU_ORANGE,
} from '../../lib/theme';
import { fieldErrorsFromZod } from '../../lib/validation';
import { UburuLogo } from '../icons/uburu-logo';
import { Button } from '../widgets/button';
import { PasswordInputField } from '../widgets/password_input';
import { TextInputField } from '../widgets/text_input';

interface Props {
  onSignIn: (username: string) => void;
}

export function LoginComponent({ onSignIn }: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormValues, string>>>({});
  const keyboardHeight = useKeyboardHeight();
  const { login, loading, error: loginError } = useLogin();

  const handleSubmit = async () => {
    if (loading) return;

    const result = loginSchema.safeParse({ username, password });

    if (!result.success) {
      setErrors(fieldErrorsFromZod(result.error));
      return;
    }

    setErrors({});
    const session = await login(result.data);
    if (session) onSignIn(result.data.username);
  };

  const scrollFocusedFieldIntoView = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  const contentMinHeight = windowHeight - insets.top - insets.bottom;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}>
      <ScrollView
        ref={scrollRef}
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          styles.scrollContent,
          {
            minHeight: contentMinHeight,
            paddingBottom: Math.max(insets.bottom, 24) + keyboardHeight,
          },
        ]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.panel}>
          <UburuLogo style={styles.logo} />

          <Text style={styles.title}>Sign into your account</Text>
          <Text style={styles.subtitle}>
            Add your username and password that corresponds to it.
          </Text>

          <TextInputField
            label="Username"
            value={username}
            onChangeText={setUsername}
            error={errors.username}
            autoCapitalize="none"
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
            onFocus={scrollFocusedFieldIntoView}
          />

          <PasswordInputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onFocus={scrollFocusedFieldIntoView}
            onSubmitEditing={handleSubmit}
          />

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          {loginError ? <Text style={styles.loginError}>{loginError}</Text> : null}

          <Button label="Sign in" onPress={handleSubmit} loading={loading} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: LOGIN_BACKGROUND,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  panel: {
    alignSelf: 'center',
    backgroundColor: SURFACE_COLOR,
    maxWidth: 420,
    paddingHorizontal: 28,
    paddingVertical: 36,
    width: '100%',
  },
  logo: {
    alignSelf: 'center',
    marginBottom: 28,
  },
  title: {
    color: STROKE_COLOR,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: MUTED_TEXT_COLOR,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 28,
    textAlign: 'center',
  },
  forgotPassword: {
    alignSelf: 'flex-start',
    marginBottom: 22,
    marginTop: -4,
  },
  forgotPasswordText: {
    color: STROKE_COLOR,
    fontSize: 14,
  },
  loginError: {
    color: DANGER_COLOR,
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerText: {
    color: STROKE_COLOR,
    fontSize: 14,
  },
  footerLink: {
    color: UBURU_ORANGE,
    fontSize: 14,
    fontWeight: '600',
  },
});
