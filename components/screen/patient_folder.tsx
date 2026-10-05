import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { usePatientFiles, type PatientFileEntry } from '../../hooks/network-requests/patient-files';
import { formatDateTime } from '../../lib/format';
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
import { AiStatusBadge, getAiStatusPresentation } from '../widgets/ai_status_badge';
import { useDocumentPreview } from '../widgets/document_preview';
import { RowAction } from '../widgets/row_action';

interface Props {
  patientId: string;
  onViewRecord: (fileId: string) => void;
}

/** Every file uploaded for one patient, each with a preview and a link to its record. */
export function PatientFolder({ patientId, onViewRecord }: Props) {
  const { files, loading, error, notFound, reload } = usePatientFiles(patientId);
  const { open, preview } = useDocumentPreview();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.content}
        data={files}
        keyExtractor={(file, index) => file.file_id || String(index)}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Patient folder</Text>
            <Text style={styles.subtitle}>{patientId}</Text>
            {files.length > 0 ? <Text style={styles.summary}>{summarize(files)}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={MUTED_TEXT_COLOR} style={styles.spinner} />
          ) : error && !notFound ? (
            <View style={styles.message}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable accessibilityRole="button" hitSlop={8} onPress={() => void reload()}>
                <Text style={styles.link}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.emptyText}>No files found in this patient folder.</Text>
          )
        }
        renderItem={({ item }) => (
          <FileCard
            file={item}
            onViewFile={() => open(item.view_url, item.file_name)}
            onViewRecord={() => onViewRecord(item.file_id)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[UBURU_ORANGE]}
            tintColor={UBURU_ORANGE}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {preview}
    </View>
  );
}

/** "4 files · 3 confirmed · 2 analysis complete, 1 waiting in queue" */
function summarize(files: PatientFileEntry[]) {
  const confirmed = files.filter((file) => file.status.toLowerCase() === 'confirmed').length;

  const aiCounts = new Map<string, number>();
  for (const file of files) {
    const { label } = getAiStatusPresentation(file.ai_processing?.status);
    aiCounts.set(label, (aiCounts.get(label) ?? 0) + 1);
  }
  const ai = [...aiCounts]
    .map(([label, count]) => `${count} ${label.charAt(0).toLowerCase()}${label.slice(1)}`)
    .join(', ');

  const fileCount = files.length === 1 ? '1 file' : `${files.length} files`;
  return [fileCount, `${confirmed} confirmed`, ai].filter(Boolean).join(' · ');
}

interface CardProps {
  file: PatientFileEntry;
  onViewFile: () => void;
  onViewRecord: () => void;
}

function FileCard({ file, onViewFile, onViewRecord }: CardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.fileName} numberOfLines={2}>
        {file.file_name || 'Untitled file'}
      </Text>
      <Text style={styles.fileDate}>{formatDateTime(file.created_at)}</Text>
      <AiStatusBadge status={file.ai_processing?.status} />

      <View style={styles.actions}>
        <RowAction label="View file" disabled={!file.view_url} onPress={onViewFile} />
        <RowAction label="View patient record" disabled={!file.file_id} onPress={onViewRecord} />
      </View>
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
  header: {
    marginBottom: 16,
  },
  title: {
    color: STROKE_COLOR,
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: MUTED_TEXT_COLOR,
    fontSize: 12,
    marginTop: 2,
  },
  summary: {
    color: STROKE_COLOR,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  spinner: {
    marginTop: 32,
  },
  message: {
    alignItems: 'center',
    gap: 8,
    marginTop: 32,
  },
  errorText: {
    color: DANGER_COLOR,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyText: {
    color: MUTED_TEXT_COLOR,
    fontSize: 14,
    marginTop: 32,
    textAlign: 'center',
  },
  link: {
    color: ACCENT_COLOR,
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: SURFACE_COLOR,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fileName: {
    color: STROKE_COLOR,
    fontSize: 15,
    fontWeight: '600',
  },
  fileDate: {
    color: MUTED_TEXT_COLOR,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
});
