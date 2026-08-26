import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { useKeyboardHeight } from '../../hooks/use_keyboard_height';
import {
  noteAuthorSchema,
  type NoteAuthorFormValues,
} from '../../lib/schemas/note-author';
import { BORDER_COLOR, MUTED_TEXT_COLOR, STROKE_COLOR, SURFACE_COLOR } from '../../lib/theme';
import { fieldErrorsFromZod } from '../../lib/validation';
import { Button } from './button';
import { TextInputField } from './text_input';

interface Props {
  visible: boolean;
  /** Prefills the form when an existing name is being edited. */
  initialValues?: NoteAuthorFormValues | null;
  onCancel: () => void;
  onProceed: (author: NoteAuthorFormValues) => void;
}

const EMPTY_FORM = { firstName: '', middleName: '', lastName: '', hospitalId: '' };

export function NoteAuthorModal({ visible, initialValues, onCancel, onProceed }: Props) {
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof NoteAuthorFormValues, string>>>({});
  const keyboardHeight = useKeyboardHeight();
  const scrollRef = useRef<ScrollView>(null);

  // Where each field sits inside the scroll content, and which one the keyboard
  // is currently open for, so it can be scrolled back into view.
  const fieldOffsets = useRef<Record<string, number>>({});
  const focusedField = useRef<keyof NoteAuthorFormValues | null>(null);

  // The modal stays mounted so it can animate, so each opening resets the form
  // instead of showing whatever was typed the previous time.
  const resetForm = () => {
    setValues(initialValues ?? EMPTY_FORM);
    setErrors({});
    focusedField.current = null;
  };

  const setField = (field: keyof NoteAuthorFormValues) => (text: string) => {
    setValues((current) => ({ ...current, [field]: text }));
  };

  // Offsets come from layout rather than constants so a wrapped label or an
  // error message appearing above a field cannot skew them.
  const rememberOffset = (field: keyof NoteAuthorFormValues) => (event: LayoutChangeEvent) => {
    fieldOffsets.current[field] = event.nativeEvent.layout.y;
  };

  const scrollToField = (field: keyof NoteAuthorFormValues) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: fieldOffsets.current[field] ?? 0, animated: true });
    });
  };

  const revealField = (field: keyof NoteAuthorFormValues) => () => {
    focusedField.current = field;
    scrollToField(field);
  };

  // Android reports the keyboard only once it has finished appearing, which is
  // after the focus handler has already scrolled, so the card is still its full
  // height at that point. Scrolling again once it has shrunk settles it.
  useEffect(() => {
    if (keyboardHeight > 0 && focusedField.current) {
      scrollToField(focusedField.current);
    }
  }, [keyboardHeight]);

  const handleProceed = () => {
    const result = noteAuthorSchema.safeParse(values);

    if (!result.success) {
      setErrors(fieldErrorsFromZod(result.error));
      return;
    }

    setErrors({});
    onProceed(result.data);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onShow={resetForm}
      onRequestClose={onCancel}>
      {/* Padding the backdrop rather than the card keeps the card centred in
          the space the keyboard leaves behind, and shrinks it to fit. */}
      <View style={[styles.backdrop, { paddingBottom: keyboardHeight }]}>
        {/* Tapping the dimmed area closes, the same as the hardware back button. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

        <View style={styles.card}>
          {/* The padding belongs to the scroll content, not the card: a field
              sitting flush against the scroll view's clipping edge loses its
              1px border to rounding on Android. */}
          <ScrollView
            ref={scrollRef}
            bounces={false}
            contentContainerStyle={styles.cardContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Add note</Text>
            <Text style={styles.subtitle}>Who is this note for?</Text>

            <View onLayout={rememberOffset('firstName')}>
              <TextInputField
                label="First name"
                value={values.firstName}
                onChangeText={setField('firstName')}
                error={errors.firstName}
                placeholder="First name"
                autoCapitalize="words"
                autoComplete="given-name"
                textContentType="givenName"
                returnKeyType="next"
                onFocus={revealField('firstName')}
              />
            </View>

            <View onLayout={rememberOffset('middleName')}>
              <TextInputField
                label="Middle name"
                value={values.middleName}
                onChangeText={setField('middleName')}
                error={errors.middleName}
                placeholder="Middle name"
                autoCapitalize="words"
                autoComplete="name-middle"
                textContentType="middleName"
                returnKeyType="next"
                onFocus={revealField('middleName')}
              />
            </View>

            <View onLayout={rememberOffset('lastName')}>
              <TextInputField
                label="Last name"
                value={values.lastName}
                onChangeText={setField('lastName')}
                error={errors.lastName}
                placeholder="Last name"
                autoCapitalize="words"
                autoComplete="family-name"
                textContentType="familyName"
                returnKeyType="next"
                onFocus={revealField('lastName')}
              />
            </View>

            <View onLayout={rememberOffset('hospitalId')}>
              <TextInputField
                label="Hospital ID"
                value={values.hospitalId}
                onChangeText={setField('hospitalId')}
                error={errors.hospitalId}
                placeholder="Hospital ID"
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="go"
                onFocus={revealField('hospitalId')}
                onSubmitEditing={handleProceed}
              />
            </View>

            <View style={styles.actions}>
              <Button
                label="Cancel"
                variant="secondary"
                fullWidth={false}
                onPress={onCancel}
                style={styles.action}
              />
              <Button
                label="Proceed"
                fullWidth={false}
                onPress={handleProceed}
                style={styles.action}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 18, 30, 0.45)',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: SURFACE_COLOR,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '85%',
    maxWidth: 420,
    overflow: 'hidden',
    width: '100%',
  },
  cardContent: {
    padding: 24,
  },
  title: {
    color: STROKE_COLOR,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: MUTED_TEXT_COLOR,
    fontSize: 14,
    marginBottom: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  // Equal halves of the row, so the pair reads as one control rather than two
  // buttons sized by however long their labels happen to be.
  action: {
    borderRadius: 12,
    flex: 1,
    minHeight: 50,
    paddingHorizontal: 12,
  },
});
