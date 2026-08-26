import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  InteractionManager,
  StyleSheet,
  View,
  Text,
  Pressable,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Canvas, Path, Skia, useCanvasRef, type SkPath } from '@shopify/react-native-skia';
import { Stack } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { InkPoint, InkStroke } from '@nitro-mlkit/digital-ink';
import { createNoteId, readNote as readStoredNote } from '../../lib/note-store';
import { saveNote } from '../../lib/note-sync';
import { isApiConfigured } from '../../lib/note-api';
import {
  ACCENT_COLOR,
  BORDER_COLOR,
  MUTED_TEXT_COLOR,
  PAGE_COLOR,
  STROKE_COLOR,
  STROKE_WIDTH,
  SURFACE_COLOR,
} from '../../lib/theme';
import { formatAuthorName, type NoteAuthorFormValues } from '../../lib/schemas/note-author';
import { EraserIcon } from '../icons/eraser';
import { MenuGridIcon } from '../icons/menu_grid';
import { PenIcon } from '../icons/pen';
import { PlusIcon } from '../icons/plus';
import { BottomNav } from '../widgets/bottom_nav';
import { HeaderLogo } from '../widgets/header_logo';
import { Button } from '../widgets/button';
import { NoteAuthorModal } from '../widgets/note_author_modal';

type CanvasMode = 'write' | 'erase';

const READY_MESSAGE = 'Write your note with your finger';
const SAVING_MESSAGE = 'Saving...';
const SAVED_MESSAGE = 'Saved';
const SAVED_OFFLINE_MESSAGE = 'Saved on this device — will upload when online';
const ERASING_MESSAGE = 'Eraser on — drag across the ink to wipe it away';
const NEEDS_AUTHOR_MESSAGE = 'Tap "Add note" to get started';

// Long enough that a pause between strokes counts as one edit rather than
// several, short enough that putting the phone down saves almost immediately.
const AUTOSAVE_DELAY = 1200;

// How close a fingertip has to come to a stroke to rub it out. Generous on
// purpose: a fingertip covers far more of the screen than the point reported.
const ERASE_RADIUS = 18;

interface Props {
  /** Id of a stored note to reopen; absent when starting a fresh one. */
  openId?: string;
  onHome: () => void;
  onProfile: () => void;
}

export function Note({ openId, onHome, onProfile }: Props) {
  const canvasRef = useCanvasRef();

  const [completedPaths, setCompletedPaths] = useState<SkPath[]>([]);
  const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
  const [status, setStatus] = useState(NEEDS_AUTHOR_MESSAGE);

  // Writing is gated on a name: there is no note to draw into until the form
  // has been filled in.
  const [author, setAuthor] = useState<NoteAuthorFormValues | null>(null);
  const [isAuthorFormOpen, setIsAuthorFormOpen] = useState(false);

  // The canvas is in one mode or the other: the same drag either lays ink down
  // or takes it away.
  const [mode, setMode] = useState<CanvasMode>('write');
  const isErasing = mode === 'erase';

  const isWriting = author !== null;

  // Set by the first save and kept for the rest of the session, so every later
  // save updates that record instead of adding another.
  const [noteId, setNoteId] = useState<string | null>(null);
  const createdAt = useRef<string | null>(null);

  // Carried through saves rather than recomputed: nothing transcribes the ink
  // any more, so wiping this would throw away a preview an earlier build wrote.
  const preview = useRef('');

  // Whether there are edits the debounce timer has not written out yet.
  const hasUnsavedEdits = useRef(false);

  // The in-progress stroke lives in a ref so each gesture event reads the
  // latest path without depending on render timing; state only mirrors it.
  const activePath = useRef<SkPath | null>(null);
  const prev = useRef({ x: 0, y: 0 });

  // Skia paths draw the ink, but the sampled points are what the eraser
  // hit-tests against, so both are recorded per stroke and kept in step: index
  // n of one always describes the same stroke as index n of the other.
  const activePoints = useRef<InkPoint[]>([]);
  const completedStrokes = useRef<InkStroke[]>([]);

  // The SVG text for each finished stroke, produced once when the finger lifts
  // rather than for the whole note on every save. Same index as the two above.
  const pathData = useRef<string[]>([]);

  /** Drops every stroke the fingertip is currently touching. */
  const eraseAt = (x: number, y: number) => {
    const strokes = completedStrokes.current;
    const kept: number[] = [];

    strokes.forEach((stroke, index) => {
      if (!strokeTouches(stroke, x, y)) kept.push(index);
    });

    if (kept.length === strokes.length) return;

    const data = pathData.current;
    completedStrokes.current = kept.map((index) => strokes[index]);
    pathData.current = kept.map((index) => data[index]);
    setCompletedPaths((paths) => kept.map((index) => paths[index]));
  };

  // runOnJS keeps these callbacks off the UI thread so they can drive React
  // state; without it they would be workletized as soon as Reanimated is added.
  //
  // The gesture is switched off rather than merely covered: gesture-handler
  // hit-tests the view the gesture is attached to, so a plain overlay painted
  // on top of the canvas does not stop a stroke from reaching it.
  const panGesture = Gesture.Pan()
    .enabled(isWriting)
    .maxPointers(1)
    .minDistance(0)
    .runOnJS(true)
    .onStart((g) => {
      if (isErasing) {
        eraseAt(g.x, g.y);
        return;
      }

      const path = Skia.Path.Make();
      path.moveTo(g.x, g.y);
      prev.current = { x: g.x, y: g.y };
      activePath.current = path;
      activePoints.current = [{ x: g.x, y: g.y, t: Date.now() }];
      setCurrentPath(path);
    })
    .onUpdate((g) => {
      if (isErasing) {
        eraseAt(g.x, g.y);
        return;
      }

      const path = activePath.current;
      if (!path) return;

      // Quadratic curve through the midpoint, anchored on the previous sample,
      // so fast strokes come out smooth instead of faceted.
      const midX = (prev.current.x + g.x) / 2;
      const midY = (prev.current.y + g.y) / 2;

      const next = path.copy();
      next.quadTo(prev.current.x, prev.current.y, midX, midY);
      prev.current = { x: g.x, y: g.y };

      activePath.current = next;
      activePoints.current.push({ x: g.x, y: g.y, t: Date.now() });
      setCurrentPath(next);
    })
    .onFinalize(() => {
      if (isErasing) return;

      const path = activePath.current;
      if (!path) return;

      // The curve stops at the last midpoint, so close the remaining gap.
      path.lineTo(prev.current.x, prev.current.y);
      activePath.current = null;

      completedStrokes.current.push({ points: activePoints.current });
      pathData.current.push(path.toSVGString());
      activePoints.current = [];

      setCompletedPaths((paths) => [...paths, path]);
      setCurrentPath(null);
    });

  const clearNote = () => {
    activePath.current = null;
    activePoints.current = [];
    completedStrokes.current = [];
    pathData.current = [];
    setCompletedPaths([]);
    setCurrentPath(null);
    setStatus(idleMessage(isWriting, isErasing));
  };

  const selectMode = (next: CanvasMode) => {
    setMode(next);
    setStatus(idleMessage(true, next === 'erase'));
  };

  const persistNote = async (writtenBy: NoteAuthorFormValues) => {
    const savedAt = new Date().toISOString();
    const id = noteId ?? createNoteId();
    createdAt.current ??= savedAt;

    // Cleared before the write, not after: an edit made while this is in
    // flight has to leave the note marked dirty again.
    hasUnsavedEdits.current = false;
    setStatus(SAVING_MESSAGE);

    try {
      const outcome = await saveNote({
        id,
        name: formatAuthorName(writtenBy),
        hospitalId: writtenBy.hospitalId,
        preview: preview.current,
        strokeCount: completedStrokes.current.length,
        createdAt: createdAt.current,
        updatedAt: savedAt,
        author: writtenBy,
        paths: [...pathData.current],
        strokes: [...completedStrokes.current],
      });

      setNoteId(id);
      setStatus(outcome === 'synced' || !isApiConfigured() ? SAVED_MESSAGE : SAVED_OFFLINE_MESSAGE);
    } catch (error) {
      console.error(error);
      setStatus('Could not save this note');
    }
  };

  // Every finished stroke and every erase restarts the clock, so a burst of
  // writing settles into one save rather than one per stroke.
  useEffect(() => {
    if (!author) return;

    // Nothing to record yet for a note that has never been saved and has no
    // ink; once it has an id an empty canvas is a real edit worth keeping.
    if (completedPaths.length === 0 && noteId === null) return;

    hasUnsavedEdits.current = true;

    // Serialising the note and handing it to storage is real work on the same
    // thread that is drawing. runAfterInteractions holds it back until the
    // screen is not being touched, so a save can never land mid-stroke.
    let interaction: { cancel: () => void } | null = null;

    const timer = setTimeout(() => {
      interaction = InteractionManager.runAfterInteractions(() => {
        void persistNote(author);
      });
    }, AUTOSAVE_DELAY);

    return () => {
      clearTimeout(timer);
      interaction?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [author, completedPaths]);

  // Leaving the screen inside the debounce window would otherwise drop the last
  // edit. The callback is held in a ref so the unmount effect can stay empty of
  // dependencies and still see the newest state.
  const flushOnExit = useRef<() => void>(() => {});
  flushOnExit.current = () => {
    if (hasUnsavedEdits.current && author) void persistNote(author);
  };

  useEffect(() => () => flushOnExit.current(), []);

  // Opening a note from the list arrives as a route param. The stored SVG is
  // what redraws the ink; the sampled points travel separately because that is
  // what the eraser reads.
  useEffect(() => {
    if (!openId) return;

    let cancelled = false;

    (async () => {
      const stored = await readStoredNote(openId);
      if (cancelled) return;

      if (!stored) {
        setStatus('That note could not be opened');
        return;
      }

      const paths = stored.paths.flatMap((data) => {
        const path = Skia.Path.MakeFromSVGString(data);
        return path ? [path] : [];
      });

      completedStrokes.current = stored.strokes;
      pathData.current = stored.paths;
      createdAt.current = stored.createdAt;
      preview.current = stored.preview;
      setNoteId(stored.id);
      setAuthor(stored.author);
      setCompletedPaths(paths);
      setStatus(stored.preview ? `Opened "${stored.preview}"` : 'Opened note');
    })();

    return () => {
      cancelled = true;
    };
  }, [openId]);

  const handleAuthorProceed = (values: NoteAuthorFormValues) => {
    setAuthor(values);
    setIsAuthorFormOpen(false);
    setStatus(idleMessage(true, isErasing));
  };

  /** Drops whatever is on the canvas and asks who the next note is for. */
  const startNewNote = () => {
    clearNote();
    setMode('write');
    setNoteId(null);
    createdAt.current = null;
    preview.current = '';
    setAuthor(null);
    setIsAuthorFormOpen(true);
  };

  const confirmStartNewNote = () => {
    if (completedPaths.length === 0) {
      startNewNote();
      return;
    }

    Alert.alert('Start a new note?', 'The ink on this note will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start new', style: 'destructive', onPress: startNewNote },
    ]);
  };

  // Finished strokes are turned into elements once and reused by reference, so
  // React skips over them entirely on later renders. Without this, every
  // pointer move — and every autosave status change — rebuilt an element for
  // every stroke already on the page, which is what makes a long note drag.
  const completedInk = useMemo(
    () => completedPaths.map((path, index) => <InkPath key={index} path={path} />),
    [completedPaths]
  );

  const hasInk = completedPaths.length > 0 || currentPath !== null;

  return (
    <View style={styles.container}>
      {/* These options merge with the ones the layout sets for this route.
          Erasing and leaving are both things you can only do to a note that
          exists, so the header carries neither until one does. */}
      <Stack.Screen
        options={{
          headerBackVisible: isWriting,
          headerLeft: isWriting ? undefined : () => null,
          headerTitle: () => <HeaderLogo tight={isWriting} />,
          headerRight: isWriting
            ? () => (
                <View style={styles.headerActions}>
                  <HeaderAction
                    label="Pen"
                    active={!isErasing}
                    icon={<PenIcon color={isErasing ? STROKE_COLOR : ACCENT_COLOR} />}
                    onPress={() => selectMode('write')}
                  />
                  <HeaderAction
                    label="Eraser"
                    active={isErasing}
                    icon={<EraserIcon color={isErasing ? ACCENT_COLOR : STROKE_COLOR} />}
                    onPress={() => selectMode('erase')}
                  />
                  {/* Reserved: carries no label and no handler until there is
                      something behind it. */}
                  <HeaderAction label="Menu" showLabel={false} icon={<MenuGridIcon />} />
                </View>
              )
            : undefined,
        }}
      />

      {author ? (
        <View style={styles.toolbar}>
          <View style={styles.toolbarRow}>
            <TouchableOpacity
              style={styles.authorInfo}
              onPress={() => setIsAuthorFormOpen(true)}>
              <View style={styles.authorNameRow}>
                <Text style={styles.authorName} numberOfLines={1}>
                  {formatAuthorName(author)}
                </Text>
                <Text style={styles.linkText}>Edit</Text>
              </View>
              <Text style={styles.authorId} numberOfLines={1}>
                {author.hospitalId}
              </Text>
            </TouchableOpacity>

            <Button
              label="Clear"
              variant="secondary"
              fullWidth={false}
              disabled={!hasInk}
              onPress={clearNote}
              style={styles.toolbarButton}
            />
          </View>

          <Text style={styles.savedSummary} numberOfLines={2}>
            {status}
          </Text>
        </View>
      ) : null}

      <View style={styles.canvasWrapper}>
        <GestureDetector gesture={panGesture}>
          <Canvas style={styles.canvas} ref={canvasRef}>
            {completedInk}
            {currentPath ? <InkPath path={currentPath} /> : null}
          </Canvas>
        </GestureDetector>

        {/* Covers the canvas so strokes cannot start before a name exists. */}
        {author ? null : (
          <View style={styles.startOverlay}>
            <Button
              label="Add note"
              fullWidth={false}
              icon={<PlusIcon color={SURFACE_COLOR} size={16} />}
              onPress={() => setIsAuthorFormOpen(true)}
              style={styles.addNoteButton}
            />
            <Text style={styles.startHint}>Add a name first, then write your note</Text>
          </View>
        )}
      </View>

      <BottomNav onHome={onHome} onAddNote={confirmStartNewNote} onProfile={onProfile} />

      <NoteAuthorModal
        visible={isAuthorFormOpen}
        initialValues={author}
        onCancel={() => setIsAuthorFormOpen(false)}
        onProceed={handleAuthorProceed}
      />
    </View>
  );
}

function InkPath({ path }: { path: SkPath }) {
  return (
    <Path
      path={path}
      color={STROKE_COLOR}
      style="stroke"
      strokeWidth={STROKE_WIDTH}
      strokeCap="round"
      strokeJoin="round"
    />
  );
}

// The resting hint depends on whether a note has been started and whether the
// eraser is on, so the two are resolved in one place.
function idleMessage(hasAuthor: boolean, isErasing: boolean) {
  if (!hasAuthor) return NEEDS_AUTHOR_MESSAGE;
  return isErasing ? ERASING_MESSAGE : READY_MESSAGE;
}

/**
 * Whether a fingertip at (x, y) is over any part of a stroke. Sampled points
 * alone are not enough — a fast stroke leaves them far apart — so each segment
 * between two samples is measured as a line rather than as its endpoints.
 */
function strokeTouches({ points }: InkStroke, x: number, y: number) {
  if (points.length === 0) return false;
  if (points.length === 1) return Math.hypot(points[0].x - x, points[0].y - y) <= ERASE_RADIUS;

  return points.some((point, index) => {
    if (index === 0) return false;
    const start = points[index - 1];
    return distanceToSegment(x, y, start.x, start.y, point.x, point.y) <= ERASE_RADIUS;
  });
}

function distanceToSegment(
  x: number,
  y: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) return Math.hypot(x - ax, y - ay);

  // How far along the segment the nearest point lies, clamped so it cannot run
  // off either end.
  const along = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lengthSquared));
  return Math.hypot(x - (ax + along * dx), y - (ay + along * dy));
}

interface HeaderActionProps {
  /** Always announced; only drawn when `showLabel`. */
  label: string;
  icon: ReactNode;
  active?: boolean;
  showLabel?: boolean;
  onPress?: () => void;
}

function HeaderAction({
  label,
  icon,
  active = false,
  showLabel = true,
  onPress,
}: HeaderActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.headerAction,
        active && styles.headerActionActive,
        pressed && onPress && styles.headerActionPressed,
      ]}>
      {icon}
      {showLabel ? (
        <Text style={[styles.headerActionLabel, active && styles.headerActionLabelActive]}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAGE_COLOR,
  },
  toolbar: {
    backgroundColor: SURFACE_COLOR,
    borderBottomColor: BORDER_COLOR,
    borderBottomWidth: 1,
    gap: 8,
    paddingBottom: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  toolbarRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  authorInfo: {
    flexShrink: 1,
    gap: 2,
  },
  authorNameRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 8,
  },
  authorName: {
    color: STROKE_COLOR,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  authorId: {
    color: MUTED_TEXT_COLOR,
    flexShrink: 1,
    fontSize: 12,
  },
  toolbarButton: {
    borderRadius: 10,
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  headerAction: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  headerActionActive: {
    backgroundColor: '#EEF2F7',
  },
  headerActionPressed: {
    opacity: 0.6,
  },
  headerActionLabel: {
    color: STROKE_COLOR,
    fontSize: 14,
    fontWeight: '600',
  },
  headerActionLabelActive: {
    color: ACCENT_COLOR,
  },
  canvasWrapper: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  startOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  addNoteButton: {
    borderRadius: 12,
    minWidth: 180,
  },
  startHint: {
    color: MUTED_TEXT_COLOR,
    fontSize: 13,
    textAlign: 'center',
  },
  savedSummary: {
    color: MUTED_TEXT_COLOR,
    flexShrink: 1,
    fontSize: 12,
  },
  linkText: {
    color: ACCENT_COLOR,
    fontSize: 12,
    fontWeight: '600',
  },
});
