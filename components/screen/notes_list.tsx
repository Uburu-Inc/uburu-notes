import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import { isApiConfigured } from '../../lib/note-api';
import { deleteNote } from '../../lib/note-store';
import { listAllNotes } from '../../lib/note-sync';
import type { NoteSummary } from '../../lib/schemas/note';
import {
  BORDER_COLOR,
  DANGER_COLOR,
  MUTED_TEXT_COLOR,
  STROKE_COLOR,
  SUBTLE_BACKGROUND,
  SURFACE_COLOR,
  UBURU_ORANGE,
} from '../../lib/theme';
import { PlusIcon } from '../icons/plus';
import { TrashIcon } from '../icons/trash';
import { BottomNav } from '../widgets/bottom_nav';
import { Button } from '../widgets/button';

interface Props {
  onOpenNote: (id: string) => void;
  onAddNote: () => void;
  onProfile: () => void;
}

export function NotesList({ onOpenNote, onAddNote, onProfile }: Props) {
  // null until the first read finishes, which separates "still loading" from
  // "there are genuinely no notes".
  const [notes, setNotes] = useState<NoteSummary[] | null>(null);

  // Saving happens on the note screen, so the list is re-read on focus rather
  // than once on mount.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        try {
          const stored = await listAllNotes();
          if (active) setNotes(stored);
        } catch (error) {
          console.warn('Could not load the note list:', error);
          if (active) setNotes([]);
        }
      })();

      return () => {
        active = false;
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
        <Text style={styles.eyebrow}>Notes</Text>
        <Text style={styles.title}>My Notes</Text>
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
          ListEmptyComponent={<EmptyState onAddNote={onAddNote} />}
          renderItem={({ item }) => (
            <NoteRow
              note={item}
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
  onOpen: () => void;
  onDelete: () => void;
}

function NoteRow({ note, onOpen, onDelete }: RowProps) {
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

        {isApiConfigured() && note.syncedAt === null ? (
          <Text style={styles.rowPending}>Waiting to upload</Text>
        ) : null}
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
