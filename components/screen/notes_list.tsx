import { useCallback, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import type { UploadSessionStats } from '../../hooks/network-requests/upload-stats';
import { deleteNote } from '../../lib/note-store';
import {
  getUploadingNoteIds,
  listAllNotes,
  onNotesSynced,
  onUploadingChanged,
} from '../../lib/note-sync';
import type { NoteSummary } from '../../lib/schemas/note';
import {
  BORDER_COLOR,
  DANGER_COLOR,
  MUTED_TEXT_COLOR,
  STROKE_COLOR,
  SUBTLE_BACKGROUND,
  SUCCESS_COLOR,
  SURFACE_COLOR,
  UBURU_ORANGE,
} from '../../lib/theme';
import { PlusIcon } from '../icons/plus';
import { TrashIcon } from '../icons/trash';
import { BottomNav } from '../widgets/bottom_nav';
import { Button } from '../widgets/button';
import { StatCard } from '../widgets/stat_card';

interface Props {
  onOpenNote: (id: string) => void;
  onAddNote: () => void;
  onProfile: () => void;
  stats: UploadSessionStats;
  statsLoading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  /** Rendered under the stat cards, above the notes kept on this device. */
  historySection?: ReactNode;
}

// Wide enough that the two stat cards sit side by side rather than stacked.
const TABLET_WIDTH = 600;

export function NotesList({
  onOpenNote,
  onAddNote,
  onProfile,
  stats,
  statsLoading,
  refreshing,
  onRefresh,
  historySection,
}: Props) {
  const isWide = useWindowDimensions().width >= TABLET_WIDTH;
  // The "no notes yet" prompt is only for a screen with nothing else on it, so
  // it stays hidden once there are upload stats to show (or while they load).
  const hasStats = stats.total_patient_folders > 0 || stats.total_patient_records > 0;
  const showEmptyState = !statsLoading && !hasStats;
  // null until the first read finishes, which separates "still loading" from
  // "there are genuinely no notes".
  const [notes, setNotes] = useState<NoteSummary[] | null>(null);
  const uploadingIds = useSyncExternalStore(onUploadingChanged, getUploadingNoteIds);

  // Saving happens on the note screen, so the list is re-read on focus rather
  // than once on mount, and again whenever a background upload finishes, so
  // "Waiting to upload" clears without leaving the screen.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        try {
          const stored = await listAllNotes();
          if (active) setNotes(stored);
        } catch (error) {
          console.warn('Could not load the note list:', error);
          if (active) setNotes([]);
        }
      };

      void load();
      const unsubscribe = onNotesSynced(() => void load());

      return () => {
        active = false;
        unsubscribe();
      };
    }, [])
  );

  const confirmDelete = (note: NoteSummary) => {
    Alert.alert('Delete note?', `"${note.name}" will be removed from this device.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteNote(note.id);
            setNotes((current) => current?.filter((entry) => entry.id !== note.id) ?? null);
          } catch (error) {
            console.error(error);
            Alert.alert('Error', 'That note could not be deleted.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Overview</Text>
        <Text style={styles.title}>Upload Stats</Text>
      </View>

      {notes === null ? (
        <View style={styles.centered}>
          <ActivityIndicator color={MUTED_TEXT_COLOR} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, notes.length === 0 && styles.listEmpty]}
          data={notes}
          keyExtractor={(note) => note.id}
          ListHeaderComponent={
            <>
              <View style={[styles.stats, isWide && styles.statsRow]}>
                <StatCard
                  label="Total Unique Patient Upload"
                  value={stats.total_patient_folders}
                  loading={statsLoading}
                  style={isWide && styles.statCard}
                />
                <StatCard
                  label="Total File Uploads"
                  value={stats.total_patient_records}
                  loading={statsLoading}
                  style={isWide && styles.statCard}
                />
              </View>
              {historySection}
              {notes.length > 0 ? <Text style={styles.sectionTitle}>On this device</Text> : null}
            </>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[UBURU_ORANGE]}
              tintColor={UBURU_ORANGE}
            />
          }
          ListEmptyComponent={showEmptyState ? <EmptyState onAddNote={onAddNote} /> : null}
          renderItem={({ item }) => (
            <NoteRow
              note={item}
              uploading={uploadingIds.has(item.id)}
              onOpen={() => onOpenNote(item.id)}
              onDelete={() => confirmDelete(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      <BottomNav activeTab="home" onAddNote={onAddNote} onProfile={onProfile} />
    </View>
  );
}

function EmptyState({ onAddNote }: { onAddNote: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No notes yet</Text>
      <Text style={styles.emptyHint}>
        Notes save themselves as you write, and are kept on this device.
      </Text>
      <Button
        label="Add note"
        fullWidth={false}
        icon={<PlusIcon color={SURFACE_COLOR} size={16} />}
        onPress={onAddNote}
        style={styles.emptyButton}
      />
    </View>
  );
}

interface RowProps {
  note: NoteSummary;
  uploading: boolean;
  onOpen: () => void;
  onDelete: () => void;
}

function NoteRow({ note, uploading, onOpen, onDelete }: RowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open note for ${note.name}`}
      onPress={onOpen}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>
          {note.name}
        </Text>
        <Text style={styles.rowPreview} numberOfLines={1}>
          {note.preview || 'Handwritten note'}
        </Text>
        <Text style={styles.rowMeta}>
          {note.hospitalId} · {formatUpdated(note.updatedAt)} · {strokeLabel(note.strokeCount)}
        </Text>

        <UploadStatus note={note} uploading={uploading} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete note for ${note.name}`}
        hitSlop={8}
        onPress={onDelete}
        style={({ pressed }) => [styles.deleteButton, pressed && styles.rowPressed]}>
        <TrashIcon color={DANGER_COLOR} />
      </Pressable>
    </Pressable>
  );
}

function strokeLabel(count: number) {
  return count === 1 ? '1 stroke' : `${count} strokes`;
}

// Today's notes are told apart by time, older ones by date, so the list stays
// readable without spelling out a full timestamp on every row.
/** Where the note's upload stands, so the user can see it go up and land. */
function UploadStatus({ note, uploading }: { note: NoteSummary; uploading: boolean }) {
  if (uploading) {
    return (
      <View style={styles.statusRow}>
        <ActivityIndicator size="small" color={UBURU_ORANGE} style={styles.statusSpinner} />
        <Text style={styles.rowPending}>Uploading…</Text>
      </View>
    );
  }

  if (note.syncedAt === null) {
    return note.uploadError ? (
      <Text style={styles.rowFailed} numberOfLines={2}>
        Upload failed: {note.uploadError} · Pull down to retry
      </Text>
    ) : (
      <Text style={styles.rowPending}>Waiting to upload</Text>
    );
  }

  return (
    <Text style={styles.rowUploaded} numberOfLines={2}>
      {note.uploadResult === 'duplicate'
        ? '✓ Already on the server (identical file)'
        : `✓ Uploaded ${formatUpdated(note.syncedAt)}`}
    </Text>
  );
}

function formatUpdated(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown date';

  const isToday = date.toDateString() === new Date().toDateString();
  return isToday
    ? `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : date.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SUBTLE_BACKGROUND,
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  eyebrow: {
    color: MUTED_TEXT_COLOR,
    fontSize: 12,
    marginBottom: 2,
  },
  title: {
    color: STROKE_COLOR,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  list: {
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  listEmpty: {
    flexGrow: 1,
  },
  stats: {
    gap: 12,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statCard: {
    flex: 1,
  },
  sectionTitle: {
    color: STROKE_COLOR,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  row: {
    alignItems: 'center',
    backgroundColor: SURFACE_COLOR,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  rowName: {
    color: STROKE_COLOR,
    fontSize: 15,
    fontWeight: '600',
  },
  rowPreview: {
    color: MUTED_TEXT_COLOR,
    fontSize: 13,
  },
  rowMeta: {
    color: MUTED_TEXT_COLOR,
    fontSize: 11,
  },
  rowPending: {
    color: UBURU_ORANGE,
    fontSize: 11,
    fontWeight: '600',
  },
  rowFailed: {
    color: DANGER_COLOR,
    fontSize: 11,
    fontWeight: '600',
  },
  rowUploaded: {
    color: SUCCESS_COLOR,
    fontSize: 11,
    fontWeight: '600',
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  statusSpinner: {
    transform: [{ scale: 0.7 }],
  },
  deleteButton: {
    padding: 8,
  },
  empty: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
  },
  emptyTitle: {
    color: STROKE_COLOR,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyHint: {
    color: MUTED_TEXT_COLOR,
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyButton: {
    borderRadius: 12,
    minWidth: 180,
  },
});
