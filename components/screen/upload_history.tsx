import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type {
  UploadHistoryEntry,
  useUploadHistory,
} from '../../hooks/network-requests/upload-history';
import { formatDateTime, humanize } from '../../lib/format';
import {
  ACCENT_COLOR,
  BORDER_COLOR,
  DANGER_COLOR,
  INPUT_BORDER_COLOR,
  MUTED_TEXT_COLOR,
  STROKE_COLOR,
  SURFACE_COLOR,
} from '../../lib/theme';
import { RowAction } from '../widgets/row_action';

interface Props {
  history: ReturnType<typeof useUploadHistory>;
  onViewFolder: (patientId: string) => void;
  onViewRecord: (fileId: string) => void;
}

/** Recent uploads, one row per patient, with search and paging. */
export function UploadHistorySection({ history, onViewFolder, onViewRecord }: Props) {
  const { patients, total, page, pageCount, goToPage, loading, error, reload } = history;
  const showSpinner = loading && patients.length === 0;

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>History</Text>
        {loading && patients.length > 0 ? (
          <ActivityIndicator size="small" color={MUTED_TEXT_COLOR} />
        ) : null}
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search by patient name"
        placeholderTextColor={MUTED_TEXT_COLOR}
        value={history.searchText}
        onChangeText={history.setSearchText}
        autoCapitalize="words"
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
      />

      {error ? (
        <View style={styles.message}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => void reload()} hitSlop={8}>
            <Text style={styles.link}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {showSpinner ? (
        <View style={styles.message}>
          <ActivityIndicator color={MUTED_TEXT_COLOR} />
        </View>
      ) : patients.length === 0 && !error ? (
        <View style={styles.message}>
          <Text style={styles.emptyText}>
            {history.activeSearch
              ? 'No uploads match that patient name.'
              : 'No upload history found.'}
          </Text>
        </View>
      ) : (
        patients.map((entry) => (
          <HistoryRow
            key={entry.patient_id || entry.latest_file_id}
            entry={entry}
            onViewFolder={() => onViewFolder(entry.patient_id)}
            onViewRecord={() => onViewRecord(entry.latest_file_id)}
          />
        ))
      )}

      {total > 0 ? (
        <View style={styles.pagination}>
          <PageButton label="‹ Prev" disabled={page <= 1 || loading} onPress={() => goToPage(page - 1)} />
          <Text style={styles.pageLabel}>
            Page {page} of {pageCount} · {total.toLocaleString()} uploads
          </Text>
          <PageButton
            label="Next ›"
            disabled={page >= pageCount || loading}
            onPress={() => goToPage(page + 1)}
          />
        </View>
      ) : null}
    </View>
  );
}

interface RowProps {
  entry: UploadHistoryEntry;
  onViewFolder: () => void;
  onViewRecord: () => void;
}

function HistoryRow({ entry, onViewFolder, onViewRecord }: RowProps) {
  const name = `${entry.first_name} ${entry.last_name}`.trim() || 'Unnamed patient';

  return (
    <View style={styles.row}>
      <Text style={styles.rowDate}>{formatDateTime(entry.latest_created_at)}</Text>
      <Text style={styles.rowName} numberOfLines={1}>
        {name}
      </Text>
      {entry.latest_status ? (
        <Text style={styles.rowStatus}>{humanize(entry.latest_status)}</Text>
      ) : null}

      <View style={styles.rowActions}>
        <RowAction label="View patient folder" disabled={!entry.patient_id} onPress={onViewFolder} />
        <RowAction
          label="View patient record"
          disabled={!entry.latest_file_id}
          onPress={onViewRecord}
        />
      </View>
    </View>
  );
}

interface ActionProps {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}

function PageButton({ label, disabled = false, onPress }: ActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [disabled && styles.disabled, pressed && styles.pressed]}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    color: STROKE_COLOR,
    fontSize: 17,
    fontWeight: '700',
  },
  search: {
    backgroundColor: SURFACE_COLOR,
    borderColor: INPUT_BORDER_COLOR,
    borderRadius: 10,
    borderWidth: 1,
    color: STROKE_COLOR,
    fontSize: 14,
    marginBottom: 12,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  message: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  emptyText: {
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
  row: {
    backgroundColor: SURFACE_COLOR,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowDate: {
    color: MUTED_TEXT_COLOR,
    fontSize: 11,
  },
  rowName: {
    color: STROKE_COLOR,
    fontSize: 15,
    fontWeight: '600',
  },
  rowStatus: {
    color: MUTED_TEXT_COLOR,
    fontSize: 13,
  },
  rowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  pagination: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  pageLabel: {
    color: MUTED_TEXT_COLOR,
    fontSize: 12,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
});
