import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { usePatientRecord } from '../../hooks/network-requests/patient-record';
import { formatDate, formatFileSize, humanize } from '../../lib/format';
import {
  ACCENT_COLOR,
  BORDER_COLOR,
  DANGER_COLOR,
  MUTED_TEXT_COLOR,
  STROKE_COLOR,
  SUBTLE_BACKGROUND,
  SURFACE_COLOR,
  UBURU_ORANGE,
} from '../../lib/theme';
import { AiStatusBadge } from '../widgets/ai_status_badge';
import { useDocumentPreview } from '../widgets/document_preview';

const EMPTY_VALUE = '-';

/** One uploaded file: the patient's bio data, its upload details and a preview. */
export function PatientRecordView({ fileId }: { fileId: string }) {
  const { detail, loading, error, notFound, reload } = usePatientRecord(fileId);
  const { open, preview } = useDocumentPreview();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  if (!detail) {
    return (
      <View style={styles.centered}>
        {loading ? (
          <ActivityIndicator color={MUTED_TEXT_COLOR} />
        ) : notFound ? (
          <>
            <Text style={styles.messageTitle}>Record not found</Text>
            <Text style={styles.messageText}>
              This patient record does not exist or is no longer available.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.errorText}>{error ?? 'Could not load this record.'}</Text>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => void reload()}>
              <Text style={styles.link}>Try again</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  const { record, view_url, ai_processing } = detail;
  const title = [
    record.last_name,
    record.first_name,
    record.hospital_id,
    formatDate(record.date_of_birth),
    record.state_of_origin,
  ]
    .filter(Boolean)
    .join(', ');
  const aiFailed = ai_processing?.status.toUpperCase() === 'FAILED';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[UBURU_ORANGE]}
            tintColor={UBURU_ORANGE}
          />
        }
        showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>Patient record</Text>
        <Text style={styles.title}>{title || 'Patient record'}</Text>

        <Section title="Patient's Bio Data">
          <Field label="First name" value={record.first_name} />
          <Field label="Middle name" value={record.middle_name} />
          <Field label="Last name" value={record.last_name} />
          <Field label="Hospital Number" value={record.hospital_id} />
          <Field label="Date of Birth" value={formatDate(record.date_of_birth)} />
          <Field label="State of Origin" value={record.state_of_origin} />
        </Section>

        <Section title="Upload & Processing">
          <Field label="Upload status" value={humanize(record.status)} />
          <Field label="AI processing">
            <AiStatusBadge status={ai_processing?.status} />
            {aiFailed && ai_processing?.error_message ? (
              <Text style={styles.errorDetail}>{ai_processing.error_message}</Text>
            ) : null}
          </Field>
          <Field label="File name">
            {view_url ? (
              <Text
                accessibilityRole="link"
                accessibilityHint="Opens a preview of the document"
                onPress={() => open(view_url, record.file_name)}
                style={[styles.value, styles.fileLink]}>
                {record.file_name || 'Open document'}
              </Text>
            ) : (
              <Text style={styles.value}>{record.file_name || EMPTY_VALUE}</Text>
            )}
          </Field>
          <Field label="File size" value={formatFileSize(record.file_size)} />
          <Field label="Upload type" value={humanize(record.upload_type)} />
        </Section>
      </ScrollView>

      {preview}
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

interface FieldProps {
  label: string;
  value?: string;
  children?: ReactNode;
}

function Field({ label, value, children }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children ?? <Text style={styles.value}>{value?.trim() || EMPTY_VALUE}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SUBTLE_BACKGROUND,
    flex: 1,
  },
  content: {
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  centered: {
    alignItems: 'center',
    backgroundColor: SUBTLE_BACKGROUND,
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    padding: 24,
  },
  messageTitle: {
    color: STROKE_COLOR,
    fontSize: 16,
    fontWeight: '700',
  },
  messageText: {
    color: MUTED_TEXT_COLOR,
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: DANGER_COLOR,
    fontSize: 14,
    textAlign: 'center',
  },
  link: {
    color: ACCENT_COLOR,
    fontSize: 14,
    fontWeight: '600',
  },
  eyebrow: {
    color: MUTED_TEXT_COLOR,
    fontSize: 12,
    marginBottom: 2,
  },
  title: {
    color: STROKE_COLOR,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  section: {
    backgroundColor: SURFACE_COLOR,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    color: STROKE_COLOR,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  field: {
    gap: 6,
    marginBottom: 16,
  },
  fieldLabel: {
    color: STROKE_COLOR,
    fontSize: 13,
    fontWeight: '700',
  },
  value: {
    color: MUTED_TEXT_COLOR,
    fontSize: 14,
  },
  fileLink: {
    color: ACCENT_COLOR,
    textDecorationLine: 'underline',
  },
  errorDetail: {
    color: DANGER_COLOR,
    fontSize: 12,
  },
});
