import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  TouchableOpacity,
  Alert,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  Canvas,
  Circle,
  Fill,
  Group,
  notifyChange,
  PaintStyle,
  Path,
  Picture,
  RoundedRect,
  Skia,
  StrokeCap,
  StrokeJoin,
  useCanvasRef,
  type SkPaint,
  type SkPath,
  type SkPicture,
} from '@shopify/react-native-skia';
import { Stack, useNavigation } from 'expo-router';
import {
  Gesture,
  GestureDetector,
  type LegacyComposedGesture,
} from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDecay,
  withTiming,
  type DerivedValue,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import type { InkPoint, InkStroke } from '@nitro-mlkit/digital-ink';
import { createNoteId } from '../../lib/note-store';
import { forgetNote, peekNote, takeNote } from '../../lib/note-prefetch';
import { saveNote } from '../../lib/note-sync';
import { isApiConfigured } from '../../lib/note-api';
import {
  ACCENT_COLOR,
  BORDER_COLOR,
  DANGER_COLOR,
  MUTED_TEXT_COLOR,
  PAGE_COLOR,
  STROKE_COLOR,
  STROKE_WIDTH,
  SURFACE_COLOR,
} from '../../lib/theme';
import { formatAuthorName, type NoteAuthorFormValues } from '../../lib/schemas/note-author';
import type { NotePage, StoredNote } from '../../lib/schemas/note';
import { ChevronDownIcon } from '../icons/chevron_down';
import { ChevronLeftIcon } from '../icons/chevron_left';
import { ChevronRightIcon } from '../icons/chevron_right';
import { ChevronUpIcon } from '../icons/chevron_up';
import { EraserIcon } from '../icons/eraser';
import { MenuGridIcon } from '../icons/menu_grid';
import { PenIcon } from '../icons/pen';
import { PlusIcon } from '../icons/plus';
import { TrashIcon } from '../icons/trash';
import { UndoIcon } from '../icons/undo';
import { BottomNav } from '../widgets/bottom_nav';
import { HeaderLogo } from '../widgets/header_logo';
import { LoadingMark } from '../widgets/loading_mark';
import { Button } from '../widgets/button';
import { NoteAuthorModal } from '../widgets/note_author_modal';

type CanvasMode = 'write' | 'erase';

const READY_MESSAGE = 'Write with your finger or pen — scroll with the arrows or two fingers';
const SAVING_MESSAGE = 'Saving...';
const SAVED_MESSAGE = 'Saved';
const SAVED_OFFLINE_MESSAGE = 'Saved on this device — will upload when online';
const ERASING_MESSAGE = 'Eraser on — drag across the ink to wipe it away';
const NEEDS_AUTHOR_MESSAGE = 'Tap "Add note" to get started';

// How long the pen has to stay off the page before a save starts. Long enough
// that a pause between strokes counts as one edit rather than several, short
// enough that putting the phone down saves almost immediately.
const AUTOSAVE_DELAY = 1200;

// How many steps undo can go back on each page. Each is only a set of
// references to strokes already in memory, so this bounds bookkeeping rather
// than saving much space.
const UNDO_LIMIT = 50;

// The eraser's size, drawn as its pointer ring. Generous on purpose: a
// fingertip covers far more of the screen than the point reported.
const ERASE_RADIUS = 18;

// How close a stroke's centre line has to come to the eraser to be rubbed
// out: the ring, plus half the line's width, so a stroke goes as soon as the
// ring overlaps any ink you can see.
const ERASE_REACH = ERASE_RADIUS + STROKE_WIDTH / 2;

// How far one tap of the scroll buttons moves the page, as a share of the
// screen: most of it, with enough overlap to keep your place.
const SCROLL_STEP = 0.8;
const SCROLL_STEP_DURATION = 250;

// The pointer under the pen or eraser, wherever it is touching or hovering.
// The eraser's ring is exactly the area it rubs out. The pen's is kept tiny —
// just enough to mark the tip — with its dot where the ink lands.
const PEN_CURSOR_RADIUS = 3.5;
const PEN_CURSOR_DOT_RADIUS = 1.25;
const PEN_CURSOR_RING_WIDTH = 1;
const ERASER_CURSOR_DOT_RADIUS = 2;
const ERASER_CURSOR_RING_WIDTH = 1.5;
const CURSOR_FILL = 'rgba(100, 116, 139, 0.12)';
const CURSOR_RING = 'rgba(100, 116, 139, 0.7)';
const CURSOR_DOT = 'rgba(30, 30, 36, 0.75)';

// How long the cover over the canvas takes to fade once the ink is up, and
// how many frames it waits first for the canvas's surface to be created and
// drawn into.
const COVER_FADE_DURATION = 120;
const REVEAL_AFTER_FRAMES = 6;

// The canvas mounts when the transition onto the screen ends; this is the
// longest it waits for a transition that never comes.
const SETTLE_FALLBACK_DELAY = 600;

// The scroll position marker along the right edge of the page.
const SCROLLBAR_WIDTH = 4;
const SCROLLBAR_INSET = 3;
const SCROLLBAR_MIN_LENGTH = 32;
const SCROLLBAR_COLOR = 'rgba(100, 116, 139, 0.45)';

const EMPTY_INK: InkSnapshot = { paths: [], strokes: [], pathData: [] };

interface Props {
  /** Id of a stored note to reopen; absent when starting a fresh one. */
  openId?: string;
  onHome: () => void;
  onProfile: () => void;
}

export function Note({ openId, onHome, onProfile }: Props) {
  const canvasRef = useCanvasRef();

  // What the canvas draws lives in shared values rather than React state, and
  // the stroke under the pen is drawn entirely on the UI thread: the gesture
  // appends each point to `livePath` and Skia redraws it there, in the same
  // frame, without waiting on the JS thread. Whatever the JS thread is busy
  // with — a save, a re-render — the ink keeps up with the pen.
  //
  // `inkPicture` holds every stroke JS has taken in, flattened into one
  // picture. `livePath` holds the rest: the stroke being drawn plus any the
  // pen has finished but JS has not taken yet. Each of those is kept as points
  // in `pendingStrokes`, so the live path can be rebuilt without them once the
  // picture holds them. Only the UI thread touches `livePath` and
  // `pendingStrokes` once they exist.
  const [blankInk] = useState(() => ({ path: Skia.Path.Make(), picture: recordInk([]) }));
  const inkPicture = useSharedValue(blankInk.picture);
  const livePath = useSharedValue(blankInk.path);
  const pendingStrokes = useSharedValue<PendingStroke[]>([]);
  const lastStrokeId = useSharedValue(0);

  // A page is taller than the screen, and the canvas shows a window onto it.
  // Ink is kept in page coordinates, and `scrollY` is how far down the page
  // that window starts. Scrolling runs on the UI thread too, so it is as
  // smooth as the writing.
  const scrollY = useSharedValue(0);
  const scrollAtStart = useSharedValue(0);
  const viewportWidth = useSharedValue(0);
  const viewportHeight = useSharedValue(0);

  // How far down the current page's ink reaches. A page runs one screen past
  // that, so there is always a clean screen below to write on, and it is never
  // shorter than two screens, so there is room to scroll into from the start.
  const inkReach = useSharedValue(0);
  const maxScroll = useDerivedValue(() => Math.max(inkReach.value, viewportHeight.value));

  // Which ends of the page the view is at, mirrored into React for the
  // scroll buttons. Only updates when one of them flips.
  const [scrollEnds, setScrollEnds] = useState({ atTop: true, atBottom: false });

  useAnimatedReaction(
    () => ({ atTop: scrollY.value <= 1, atBottom: scrollY.value >= maxScroll.value - 1 }),
    (next, previous) => {
      if (previous && next.atTop === previous.atTop && next.atBottom === previous.atBottom) return;
      scheduleOnRN(setScrollEnds, next);
    }
  );

  /** Runs on the UI thread. Glides the page by a share of the screen. */
  const scrollPageBy = (screens: number) => {
    'worklet';
    const target = scrollY.value + screens * viewportHeight.value;
    scrollY.value = withTiming(Math.min(Math.max(target, 0), maxScroll.value), {
      duration: SCROLL_STEP_DURATION,
    });
  };

  // A note tapped in the list starts loading at the tap (see note-prefetch), so
  // by this first render it has usually arrived. The screen is then built from
  // it straight away — name, toolbar, pages — with no loading state; only the
  // ink still has to reach the canvas. Otherwise the effect below waits for it.
  const [initialNote] = useState(() =>
    openId === undefined ? null : (peekNote(openId) ?? null)
  );
  const [initialPages] = useState(() =>
    initialNote ? initialNote.pages.map(loadPage) : [blankPage()]
  );

  // Every page of the note, in order. Each carries its own undo steps and
  // remembers where it was scrolled to, so moving between pages loses nothing.
  const pages = useRef<Page[]>(initialPages);
  const pageIndex = useRef(0);
  const currentPage = () => pages.current[pageIndex.current];

  // What the toolbar shows about the pages and the page on screen. Changes
  // once per finished stroke, erase or page turn, never per point.
  const [pager, setPager] = useState({ index: 0, count: initialPages.length });
  const [pagePaths, setPagePaths] = useState<SkPath[]>(initialPages[0].ink.paths);
  const [canUndo, setCanUndo] = useState(false);
  const [status, setStatus] = useState(
    initialNote ? openedMessage(initialNote) : NEEDS_AUTHOR_MESSAGE
  );

  // Writing is gated on a name: there is no note to draw into until the form
  // has been filled in.
  const [author, setAuthor] = useState<NoteAuthorFormValues | null>(
    initialNote?.author ?? null
  );
  const [isAuthorFormOpen, setIsAuthorFormOpen] = useState(false);

  // The canvas is in one mode or the other: the same drag either lays ink down
  // or takes it away.
  const [mode, setMode] = useState<CanvasMode>('write');
  const isErasing = mode === 'erase';

  const isWriting = author !== null;

  // A saved note that had not finished loading by the first render. Until it
  // has, this screen is neither a new note waiting for a name nor the note
  // being opened, so the "Add note" prompt stays hidden rather than flashing
  // up and vanishing, and the loading mark shows instead.
  const [isOpening, setIsOpening] = useState(openId !== undefined && initialNote === null);
  const [couldNotOpen, setCouldNotOpen] = useState(false);

  // The canvas — its drawing surface, gestures and everything drawn on it —
  // is by far the heaviest part of this screen, so it mounts only once the
  // transition onto the screen has finished. Mounted during the transition,
  // setting it up fought the animation for the UI thread, which is what made
  // moving to this screen stutter. Until then a cover stands in for it.
  const navigation = useNavigation<{
    addListener(
      event: 'transitionEnd',
      callback: (event: { data: { closing: boolean } }) => void
    ): () => void;
  }>();
  const [isSettled, setIsSettled] = useState(false);

  useEffect(() => {
    // A screen that appears without animating in never gets transitionEnd.
    const fallback = setTimeout(() => setIsSettled(true), SETTLE_FALLBACK_DELAY);
    const unsubscribe = navigation.addListener('transitionEnd', (event) => {
      if (!event.data.closing) setIsSettled(true);
    });
    return () => {
      clearTimeout(fallback);
      unsubscribe();
    };
  }, [navigation]);

  // Whether this screen's ink is ready to show: from the start for a new
  // note, or a note that had loaded before the first render; otherwise once
  // it has, in the same update that brings in its toolbar.
  const [isInkReady, setIsInkReady] = useState(openId === undefined || initialNote !== null);

  // A cover over the canvas until it is showing this screen's ink: its
  // surface is black until Skia draws a first frame into it. The cover fades
  // on the UI thread the moment the ink is up, so lifting it never waits on
  // the JS thread; it is only unmounted afterwards.
  const coverOpacity = useSharedValue(1);
  const coverStyle = useAnimatedStyle(() => ({ opacity: coverOpacity.value }));
  const [isCoverGone, setIsCoverGone] = useState(false);

  /**
   * Runs on the UI thread once the canvas has mounted and the ink has been
   * handed to it. The canvas's surface is created and drawn into over the next
   * few frames, so the cover starts to fade a little after, by when the ink is
   * on screen.
   */
  const revealCanvas = () => {
    'worklet';
    let framesLeft = REVEAL_AFTER_FRAMES;
    const waitAFrame = () => {
      if (framesLeft > 0) {
        framesLeft -= 1;
        requestAnimationFrame(waitAFrame);
        return;
      }
      coverOpacity.value = withTiming(0, { duration: COVER_FADE_DURATION }, (finished) => {
        if (finished) scheduleOnRN(setIsCoverGone, true);
      });
    };
    requestAnimationFrame(waitAFrame);
  };

  // After the commit that mounts the canvas or brings in the ink, whichever
  // comes last, so both the canvas and the layout around it are in place.
  useEffect(() => {
    if (isSettled && isInkReady) scheduleOnUI(revealCanvas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSettled, isInkReady]);

  // Set by the first save and kept for the rest of the session, so every later
  // save updates that record instead of adding another. A ref rather than state
  // because saves overlap with writing: a second save that starts before the
  // first has finished has to see the id straight away, or it mints another.
  const noteId = useRef<string | null>(initialNote?.id ?? null);
  const createdAt = useRef<string | null>(initialNote?.createdAt ?? null);

  // Carried through saves rather than recomputed: nothing transcribes the ink
  // any more, so wiping this would throw away a preview an earlier build wrote.
  const preview = useRef(initialNote?.preview ?? '');

  // Whether anything has changed since the last save, and a count of changes
  // that the autosave keys off. Opening a note or turning a page is not a
  // change; writing, erasing, undoing and adding a page are.
  const hasUnsavedEdits = useRef(false);
  const [edits, setEdits] = useState(0);

  // Autosave holds off while the pen is on the page, and until it has been off
  // for a moment. Drawing no longer needs the JS thread, but taking in the
  // stroke when the pen lifts does, and a save would hold that up.
  const isPenDown = useRef(false);
  const lastPenUp = useRef(0);

  // The ink as it stood when the eraser touched down, so a whole drag undoes
  // as one step rather than stroke by stroke.
  const inkBeforeErase = useRef<InkSnapshot | null>(null);

  // The pointer on the canvas, in screen coordinates. Moved on the UI thread
  // by the gestures, so it stays under the pen or finger without lag.
  const cursorX = useSharedValue(0);
  const cursorY = useSharedValue(0);
  const cursorOpacity = useSharedValue(0);
  const eraserOn = useSharedValue(false);

  // Where the eraser was at the previous touch event, in page coordinates.
  const eraseFromX = useSharedValue(0);
  const eraseFromY = useSharedValue(0);

  // Whether the touch now on the canvas is erasing, taken from `eraserOn`
  // when it begins.
  const touchErases = useSharedValue(false);

  useEffect(() => {
    eraserOn.value = isErasing;
  }, [isErasing, eraserOn]);

  /** Runs on the UI thread. Shows the pointer at (x, y) on screen. */
  const moveCursor = (x: number, y: number) => {
    'worklet';
    cursorX.value = x;
    cursorY.value = y;
    cursorOpacity.value = 1;
  };

  const markEdited = () => {
    hasUnsavedEdits.current = true;
    setEdits((count) => count + 1);
  };

  // A note that has never been saved and has no ink yet has nothing worth
  // keeping. Once it has an id, an empty page is a real edit.
  const isWorthSaving = () =>
    noteId.current !== null || pages.current.some((page) => page.ink.paths.length > 0);

  /** Runs on the UI thread. Redraws the live ink from the strokes still pending. */
  const rebuildLiveInk = () => {
    'worklet';
    const live = livePath.value;
    live.rewind();
    for (const stroke of pendingStrokes.value) traceStroke(live, stroke.points, stroke.finished);
    notifyChange(livePath);
  };

  /**
   * Runs on the UI thread. Puts up a new picture of the page's finished ink
   * and, in the same frame, drops the live copies of strokes up to
   * `takenStrokeId`, which the picture now holds, and moves the page to
   * `scrollTo` when there is one. Doing it all at once means a stroke is never
   * missing from the page, or drawn twice, while it changes hands, and a page
   * never shows for a frame at another page's scroll position.
   */
  const showInk = (
    picture: SkPicture,
    takenStrokeId: number,
    reach: number,
    scrollTo: number | null
  ) => {
    'worklet';
    inkPicture.value = picture;
    inkReach.value = reach;
    if (scrollTo !== null) scrollY.value = scrollTo;

    const remaining = pendingStrokes.value.filter((stroke) => stroke.id > takenStrokeId);
    if (remaining.length === pendingStrokes.value.length) return;

    pendingStrokes.value = remaining;
    rebuildLiveInk();
  };

  /**
   * Puts the current page on the canvas. Its finished ink is flattened into
   * one picture here, once, because the canvas re-records everything it holds
   * on every update: as separate paths, a long page meant redrawing every
   * earlier stroke for each new point of the one being written.
   */
  const drawPage = (takenStrokeId = 0, scrollTo: number | null = null) => {
    const { ink, undo } = currentPage();
    scheduleOnUI(showInk, recordInk(ink.paths), takenStrokeId, inkBottom(ink.paths), scrollTo);
    setPagePaths(ink.paths);
    setCanUndo(undo.length > 0);
  };

  /** Replaces the current page's ink with an edited version. */
  const editInk = (next: InkSnapshot, takenStrokeId = 0) => {
    currentPage().ink = next;
    drawPage(takenStrokeId);
    markEdited();
  };

  /** Keeps `snapshot` as the state the page's next undo goes back to. */
  const rememberForUndo = (snapshot: InkSnapshot) => {
    const page = currentPage();
    page.undo = [...page.undo.slice(1 - UNDO_LIMIT), snapshot];
    setCanUndo(true);
  };

  const markPenDown = () => {
    isPenDown.current = true;
  };

  const markPenUp = () => {
    isPenDown.current = false;
    lastPenUp.current = Date.now();
  };

  /** Takes in a stroke the UI thread has finished drawing. */
  const finishStroke = (id: number, points: InkPoint[]) => {
    markPenUp();

    // Traced from the same points, the same way, as the live copy on screen,
    // so the stroke does not shift when the picture takes it over.
    const path = Skia.Path.Make();
    traceStroke(path, points, true);

    // The lists are replaced rather than added to, so the snapshot kept for
    // undo stays exactly as it was.
    const { ink } = currentPage();
    rememberForUndo(ink);
    editInk(
      {
        paths: [...ink.paths, path],
        strokes: [...ink.strokes, { points }],
        pathData: [...ink.pathData, path.toSVGString()],
      },
      id
    );
  };

  /** Steps the page back to how it was before its last stroke, erase or clear. */
  const undo = () => {
    const page = currentPage();
    const previous = page.undo[page.undo.length - 1];
    if (!previous) return;

    page.undo = page.undo.slice(0, -1);
    editInk(previous);
  };

  /**
   * Drops every stroke the eraser passed over on its way from one point to
   * the next. Page coordinates.
   */
  const eraseAlong = (fromX: number, fromY: number, toX: number, toY: number) => {
    const { ink } = currentPage();
    const sweep = { ax: fromX, ay: fromY, bx: toX, by: toY };
    const kept: number[] = [];

    ink.strokes.forEach((stroke, index) => {
      if (!strokeTouches(stroke, sweep)) kept.push(index);
    });

    if (kept.length === ink.strokes.length) return;

    editInk({
      paths: kept.map((index) => ink.paths[index]),
      strokes: kept.map((index) => ink.strokes[index]),
      pathData: kept.map((index) => ink.pathData[index]),
    });
  };

  /** Runs on the UI thread. Starts a stroke at (x, y) on screen. */
  const beginStroke = (x: number, y: number) => {
    'worklet';
    const id = lastStrokeId.value + 1;
    lastStrokeId.value = id;

    const first = { x, y: y + scrollY.value, t: Date.now() };
    pendingStrokes.value = [...pendingStrokes.value, { id, points: [first], finished: false }];

    livePath.value.moveTo(first.x, first.y);
    notifyChange(livePath);
  };

  /** Runs on the UI thread. Carries the stroke under the pen on to (x, y). */
  const extendStroke = (x: number, y: number) => {
    'worklet';
    const strokes = pendingStrokes.value;
    const stroke = strokes[strokes.length - 1];
    if (!stroke || stroke.finished) return;

    // The stroke was made on this thread, and nothing but this thread reads
    // it, so it is extended in place rather than copied per point.
    const point = { x, y: y + scrollY.value, t: Date.now() };
    traceSegment(livePath.value, stroke.points[stroke.points.length - 1], point);
    stroke.points.push(point);
    notifyChange(livePath);
  };

  /** Runs on the UI thread. Hands a finished stroke over to JS, or drops it. */
  const endStroke = (success: boolean) => {
    'worklet';
    const strokes = pendingStrokes.value;
    const stroke = strokes[strokes.length - 1];

    // The pen touched down but never started a stroke.
    if (!stroke || stroke.finished) {
      scheduleOnRN(markPenUp);
      return;
    }

    // Cancelled rather than ended: a second finger landed, so this was the
    // first finger of a scroll, not writing.
    if (!success) {
      pendingStrokes.value = strokes.slice(0, -1);
      rebuildLiveInk();
      scheduleOnRN(markPenUp);
      return;
    }

    stroke.finished = true;
    const last = stroke.points[stroke.points.length - 1];
    livePath.value.lineTo(last.x, last.y);
    notifyChange(livePath);

    scheduleOnRN(finishStroke, stroke.id, stroke.points);
  };

  const beginErase = () => {
    markPenDown();
    inkBeforeErase.current = currentPage().ink;
  };

  const endErase = () => {
    markPenUp();

    // eraseAlong only replaces the ink when it rubs something out, so the same
    // ink means the drag missed everything and there is no step.
    const before = inkBeforeErase.current;
    inkBeforeErase.current = null;
    if (before && before !== currentPage().ink) rememberForUndo(before);
  };

  // The erasing itself is hit-testing against the stroke list, which lives on
  // the JS thread, so each movement is sent over there, already in page
  // coordinates.
  //
  // A quick swipe can carry the finger well past the eraser's own width
  // between two touch events, so it is the whole stretch swept since the last
  // event that gets erased, not just the spot where each event lands.
  // Otherwise the ink between those spots is left behind.

  /** Runs on the UI thread. Starts an eraser drag at (x, y) on screen. */
  const beginSweep = (x: number, y: number) => {
    'worklet';
    const pageY = y + scrollY.value;
    eraseFromX.value = x;
    eraseFromY.value = pageY;
    scheduleOnRN(beginErase);
    scheduleOnRN(eraseAlong, x, pageY, x, pageY);
  };

  /** Runs on the UI thread. Erases along the eraser's path on to (x, y). */
  const continueSweep = (x: number, y: number) => {
    'worklet';
    const pageY = y + scrollY.value;
    scheduleOnRN(eraseAlong, eraseFromX.value, eraseFromY.value, x, pageY);
    eraseFromX.value = x;
    eraseFromY.value = pageY;
  };

  // All three gestures are switched off rather than merely covered:
  // gesture-handler hit-tests the view the gesture is attached to, so a plain
  // overlay painted on top of the canvas does not stop a stroke from reaching
  // it.
  //
  // Memoised so the native handlers are only reconfigured when a note starts
  // or ends. The JS functions they reach only read refs and shared values, so
  // holding on to the first render's copies is safe.

  // One gesture serves both tools. Swapping a pen gesture for an eraser
  // gesture on the detector broke the pen: gesture-handler moves the new
  // gesture's callbacks onto the handler already attached, which is the pen's
  // own (memoised) gesture object, so switching back re-attached a "pen" still
  // running the eraser's callbacks. Picking the tool inside the gesture keeps
  // the detector's gestures fixed for the life of the note.
  //
  // It runs on the UI thread, as worklets, calling over to JS only when the
  // pen goes down and when it lifts, and — for the eraser — with each
  // movement. One pointer only: a second finger cancels it, which is how a
  // scroll takes over from what looked like the start of a stroke.
  const inkGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isWriting)
        .maxPointers(1)
        .minDistance(0)
        .onBegin((g) => {
          'worklet';
          // Writing or erasing on a page that is still gliding from a flick
          // would smear, so the page stops the moment the pen lands.
          cancelAnimation(scrollY);

          // The pointer rides along at the tip for as long as the pen is
          // down, so there is always a mark of exactly where it is.
          moveCursor(g.x, g.y);

          // Fixed for the whole touch, so a tool change mid-stroke cannot
          // leave half of it drawn and half of it erased.
          touchErases.value = eraserOn.value;
          if (touchErases.value) {
            beginSweep(g.x, g.y);
          } else {
            scheduleOnRN(markPenDown);
          }
        })
        .onStart((g) => {
          'worklet';
          if (!touchErases.value) beginStroke(g.x, g.y);
        })
        .onUpdate((g) => {
          'worklet';
          moveCursor(g.x, g.y);
          if (touchErases.value) {
            continueSweep(g.x, g.y);
          } else {
            extendStroke(g.x, g.y);
          }
        })
        .onFinalize((_g, success) => {
          'worklet';
          // A pen that goes on hovering brings it straight back.
          cursorOpacity.value = 0;

          if (touchErases.value) {
            scheduleOnRN(endErase);
          } else {
            endStroke(success);
          }
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isWriting]
  );

  // A pen held just above the screen shows where it would write — or, with
  // the eraser on, what it would rub out — before it touches. Needs a stylus
  // (or mouse) that reports hovering; fingers do not.
  const hoverGesture = useMemo(
    () =>
      Gesture.Hover()
        .enabled(isWriting)
        .onStart((g) => {
          'worklet';
          moveCursor(g.x, g.y);
        })
        .onUpdate((g) => {
          'worklet';
          moveCursor(g.x, g.y);
        })
        .onFinalize(() => {
          'worklet';
          cursorOpacity.value = 0;
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isWriting]
  );

  // Two fingers scroll the page, in either mode, and a flick keeps it gliding.
  const scrollGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isWriting)
        .minPointers(2)
        .averageTouches(true)
        .onStart(() => {
          'worklet';
          cancelAnimation(scrollY);
          scrollAtStart.value = scrollY.value;
        })
        .onUpdate((g) => {
          'worklet';
          const next = scrollAtStart.value - g.translationY;
          scrollY.value = Math.min(Math.max(next, 0), maxScroll.value);
        })
        .onEnd((g) => {
          'worklet';
          if (maxScroll.value <= 0) return;
          scrollY.value = withDecay({ velocity: -g.velocityY, clamp: [0, maxScroll.value] });
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isWriting]
  );

  const canvasGesture = useMemo(
    () => Gesture.Simultaneous(inkGesture, scrollGesture, hoverGesture),
    [inkGesture, scrollGesture, hoverGesture]
  );

  /** Shows another page of the note, where it was last left. */
  const goToPage = (index: number) => {
    if (index < 0 || index >= pages.current.length) return;

    if (index !== pageIndex.current) currentPage().scrollY = scrollY.value;
    pageIndex.current = index;
    setPager({ index, count: pages.current.length });
    drawPage(0, currentPage().scrollY);
  };

  const addPage = () => {
    // A blank page at the end is reused rather than stacking up empty ones.
    const last = pages.current[pages.current.length - 1];
    if (last.ink.paths.length > 0) {
      pages.current = [...pages.current, blankPage()];
      markEdited();
    }
    goToPage(pages.current.length - 1);
  };

  /**
   * Removes the page on screen and shows the one before it, or the new first
   * page when it was the first. A note always keeps at least one page.
   */
  const deletePage = () => {
    if (pages.current.length <= 1) return;

    const index = pageIndex.current;
    pages.current = pages.current.filter((_, position) => position !== index);
    pageIndex.current = Math.max(0, index - 1);

    setPager({ index: pageIndex.current, count: pages.current.length });
    drawPage(0, currentPage().scrollY);
    markEdited();
  };

  // A blank page goes without asking; one with ink on it needs a yes, since
  // undo does not reach back past a deleted page.
  const confirmDeletePage = () => {
    if (currentPage().ink.paths.length === 0) {
      deletePage();
      return;
    }

    Alert.alert(`Delete page ${pageIndex.current + 1}?`, 'The ink on this page will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: deletePage },
    ]);
  };

  /** Wipes the page on screen. The rest of the note is left alone. */
  const clearPage = () => {
    const { ink } = currentPage();
    if (ink.paths.length === 0) return;

    rememberForUndo(ink);
    editInk(EMPTY_INK);
    setStatus(idleMessage(isWriting, isErasing));
  };

  const selectMode = (next: CanvasMode) => {
    // Straight onto the UI thread, rather than after the re-render, so a
    // touch that follows the tap at once already uses the new tool.
    eraserOn.value = next === 'erase';
    setMode(next);
    setStatus(idleMessage(true, next === 'erase'));
  };

  const onCanvasLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    viewportWidth.value = width;
    viewportHeight.value = height;
  };

  const persistNote = async (writtenBy: NoteAuthorFormValues) => {
    const savedAt = new Date().toISOString();
    const id = (noteId.current ??= createNoteId());
    createdAt.current ??= savedAt;

    // Read now, before the first await: the ink lists are never edited in
    // place, so this is a consistent copy even if writing carries on.
    const notePages = pages.current.map(({ ink }) => ({
      paths: ink.pathData,
      strokes: ink.strokes,
    }));

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
        strokeCount: notePages.reduce((total, page) => total + page.strokes.length, 0),
        createdAt: createdAt.current,
        updatedAt: savedAt,
        author: writtenBy,
        pages: notePages,
      });

      setStatus(outcome === 'synced' || !isApiConfigured() ? SAVED_MESSAGE : SAVED_OFFLINE_MESSAGE);
    } catch (error) {
      console.error(error);
      setStatus('Could not save this note');
    }
  };

  // Every edit restarts the clock, so a burst of writing settles into one save
  // rather than one per stroke. A change of author restarts it too, and when
  // the author goes away — a new note starting — any pending save is dropped.
  useEffect(() => {
    if (!author || !hasUnsavedEdits.current || !isWorthSaving()) return;

    // Serialising the note is real work on the same thread that draws the ink,
    // so it only starts once the pen has been off the page for the full delay,
    // checking back for as long as that takes. That keeps saving in the pauses
    // between strokes, never mid-stroke. (InteractionManager used to guard
    // this, but it does not see gesture-handler gestures, so it never waited.)
    let timer: ReturnType<typeof setTimeout>;

    const saveWhenIdle = () => {
      const idleFor = Date.now() - lastPenUp.current;

      if (isPenDown.current || idleFor < AUTOSAVE_DELAY) {
        timer = setTimeout(
          saveWhenIdle,
          isPenDown.current ? AUTOSAVE_DELAY : AUTOSAVE_DELAY - idleFor
        );
        return;
      }

      void persistNote(author);
    };

    timer = setTimeout(saveWhenIdle, AUTOSAVE_DELAY);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [author, edits]);

  // Leaving the screen, or starting another note, inside the debounce window
  // would otherwise drop the last edit. The callback is held in a ref so the
  // unmount effect can stay empty of dependencies and still see the newest
  // state.
  const flushPendingSave = useRef<() => void>(() => {});
  flushPendingSave.current = () => {
    if (hasUnsavedEdits.current && author && isWorthSaving()) void persistNote(author);
  };

  useEffect(() => () => flushPendingSave.current(), []);

  // Opening a note from the list arrives as a route param. The stored SVG is
  // what redraws the ink; the sampled points travel separately because that is
  // what the eraser reads.
  useEffect(() => {
    if (!openId) return;

    // Built from the prefetched note on the first render, and still showing
    // it: the toolbar and pages are already in place, so only the ink has to
    // be handed to the canvas.
    if (initialNote?.id === openId && pages.current === initialPages) {
      forgetNote(openId);
      drawPage(0, 0);
      return;
    }

    let cancelled = false;
    setIsOpening(true);
    setCouldNotOpen(false);

    // The same screen reopened on another note: its cover goes back up.
    setIsInkReady(false);
    coverOpacity.value = 1;
    setIsCoverGone(false);

    (async () => {
      let stored: StoredNote | null = null;
      try {
        stored = await takeNote(openId);
      } catch (error) {
        console.warn(`Could not read note ${openId}:`, error);
      }
      if (cancelled) return;

      // Falls back to the new-note prompt, saying why.
      if (!stored) {
        setCouldNotOpen(true);
        setIsOpening(false);
        setIsInkReady(true);
        return;
      }

      pages.current = stored.pages.map(loadPage);
      pageIndex.current = 0;
      createdAt.current = stored.createdAt;
      preview.current = stored.preview;
      noteId.current = stored.id;
      setPager({ index: 0, count: pages.current.length });
      drawPage(0, 0);

      // In the same update as the author, so the screen goes straight from
      // opening to the opened note, and the cover lifts once that is in.
      setAuthor(stored.author);
      setIsOpening(false);
      setIsInkReady(true);
      setStatus(openedMessage(stored));
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  const handleAuthorProceed = (values: NoteAuthorFormValues) => {
    setAuthor(values);
    setIsAuthorFormOpen(false);
    setStatus(idleMessage(true, isErasing));

    // Renaming a saved note is an edit. A new one gets its author saved along
    // with its first stroke.
    if (noteId.current !== null) markEdited();
  };

  /** Drops whatever is on the canvas and asks who the next note is for. */
  const startNewNote = () => {
    flushPendingSave.current();
    setCouldNotOpen(false);

    pages.current = [blankPage()];
    pageIndex.current = 0;
    setPager({ index: 0, count: 1 });
    drawPage(0, 0);

    setMode('write');
    noteId.current = null;
    createdAt.current = null;
    preview.current = '';
    hasUnsavedEdits.current = false;
    setAuthor(null);
    setStatus(NEEDS_AUTHOR_MESSAGE);
    setIsAuthorFormOpen(true);
  };

  const confirmStartNewNote = () => {
    if (!pages.current.some((page) => page.ink.paths.length > 0)) {
      startNewNote();
      return;
    }

    Alert.alert('Start a new note?', 'The ink on this note will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start new', style: 'destructive', onPress: startNewNote },
    ]);
  };

  const hasInk = pagePaths.length > 0;
  const isOnBlankLastPage = pager.index === pager.count - 1 && !hasInk;

  // These options merge with the ones the layout sets for this route. Erasing
  // and leaving are both things you can only do to a note that exists, so the
  // header carries neither until one does — except that a note still opening
  // already has somewhere to go back to. Memoised because new options push an
  // update to the native header, and this screen re-renders after every stroke
  // and every autosave status change.
  const showBack = isWriting || isOpening;

  const screenOptions = useMemo(
    () => ({
      headerBackVisible: showBack,
      headerLeft: showBack ? undefined : () => null,
      headerTitle: () => <HeaderLogo tight={showBack} />,
      headerRight: isWriting
        ? () => (
            <View style={styles.headerActions}>
              <IconButton label="Undo" icon={<UndoIcon />} disabled={!canUndo} onPress={undo} />
              <IconButton
                label="Pen"
                active={!isErasing}
                icon={<PenIcon color={isErasing ? STROKE_COLOR : ACCENT_COLOR} />}
                onPress={() => selectMode('write')}
              />
              <IconButton
                label="Eraser"
                active={isErasing}
                icon={<EraserIcon color={isErasing ? ACCENT_COLOR : STROKE_COLOR} />}
                onPress={() => selectMode('erase')}
              />
              {/* Reserved: no handler until there is something behind it. */}
              <IconButton label="Menu" icon={<MenuGridIcon />} />
            </View>
          )
        : undefined,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isWriting, showBack, isErasing, canUndo]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={screenOptions} />

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

            <View style={styles.toolbarButtons}>
              <Button
                label="New page"
                variant="secondary"
                fullWidth={false}
                disabled={isOnBlankLastPage}
                onPress={addPage}
                style={styles.toolbarButton}
              />
              <Button
                label="Clear"
                variant="secondary"
                fullWidth={false}
                disabled={!hasInk}
                onPress={clearPage}
                style={styles.toolbarButton}
              />
            </View>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.savedSummary} numberOfLines={2}>
              {status}
            </Text>

            {/* Only once there is somewhere to go. */}
            {pager.count > 1 ? (
              <View style={styles.pager}>
                <IconButton
                  label="Previous page"
                  icon={<ChevronLeftIcon size={14} />}
                  disabled={pager.index === 0}
                  onPress={() => goToPage(pager.index - 1)}
                />
                <Text style={styles.pagerLabel}>
                  Page {pager.index + 1} of {pager.count}
                </Text>
                <IconButton
                  label="Next page"
                  icon={<ChevronRightIcon size={14} />}
                  disabled={pager.index === pager.count - 1}
                  onPress={() => goToPage(pager.index + 1)}
                />
                <IconButton
                  label={`Delete page ${pager.index + 1}`}
                  icon={<TrashIcon color={DANGER_COLOR} size={14} />}
                  onPress={confirmDeletePage}
                />
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.canvasWrapper} onLayout={onCanvasLayout}>
        {isSettled ? (
          <NoteCanvas
            canvasRef={canvasRef}
            gesture={canvasGesture}
            inkPicture={inkPicture}
            livePath={livePath}
            scrollY={scrollY}
            maxScroll={maxScroll}
            viewportWidth={viewportWidth}
            viewportHeight={viewportHeight}
            cursorX={cursorX}
            cursorY={cursorY}
            cursorOpacity={cursorOpacity}
            eraserOn={eraserOn}
          />
        ) : null}

        {/* A dependable way to scroll with one finger or the pen. They sit on
            top of the canvas, so a tap here never lands as ink. */}
        {author ? (
          <View style={styles.scrollButtons} pointerEvents="box-none">
            <IconButton
              label="Scroll up"
              icon={<ChevronUpIcon size={18} />}
              disabled={scrollEnds.atTop}
              onPress={() => scheduleOnUI(scrollPageBy, -SCROLL_STEP)}
              style={styles.scrollButton}
            />
            <IconButton
              label="Scroll down"
              icon={<ChevronDownIcon size={18} />}
              disabled={scrollEnds.atBottom}
              onPress={() => scheduleOnUI(scrollPageBy, SCROLL_STEP)}
              style={styles.scrollButton}
            />
          </View>
        ) : null}

        {/* Covers the canvas so strokes cannot start before a name exists.
            Not while a note is opening: it has a name, just not loaded yet,
            and the canvas stays switched off until it is. */}
        {author || isOpening ? null : (
          <View style={styles.startOverlay}>
            <Button
              label="Add note"
              fullWidth={false}
              icon={<PlusIcon color={SURFACE_COLOR} size={16} />}
              onPress={() => setIsAuthorFormOpen(true)}
              style={styles.addNoteButton}
            />
            <Text style={styles.startHint}>
              {couldNotOpen
                ? 'That note could not be opened. Add a name to start a new one.'
                : 'Add a name first, then write your note'}
            </Text>
          </View>
        )}

        {/* Over everything else here until the canvas is showing this
            screen's ink, then gone. Plain unless there is a genuine wait on
            storage: a few frames is too quick for anything on it to register.
            Never in the way of a touch — nothing under it can be written on
            until the note is ready anyway. */}
        {isCoverGone ? null : (
          <Animated.View pointerEvents="none" style={[styles.loadingCover, coverStyle]}>
            {isOpening ? <LoadingMark label="Opening note" /> : null}
          </Animated.View>
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

interface NoteCanvasProps {
  canvasRef: ReturnType<typeof useCanvasRef>;
  gesture: LegacyComposedGesture;
  inkPicture: DerivedValue<SkPicture>;
  livePath: DerivedValue<SkPath>;
  scrollY: DerivedValue<number>;
  maxScroll: DerivedValue<number>;
  viewportWidth: DerivedValue<number>;
  viewportHeight: DerivedValue<number>;
  cursorX: DerivedValue<number>;
  cursorY: DerivedValue<number>;
  cursorOpacity: DerivedValue<number>;
  eraserOn: DerivedValue<boolean>;
}

/**
 * The drawing surface and everything drawn on it, apart from the rest of the
 * screen so it can mount on its own once the screen has finished animating
 * in. Its surface, gestures and UI-thread bindings are the heaviest things
 * the screen sets up. Every prop is a stable reference, so the screen's own
 * re-renders pass it by.
 */
const NoteCanvas = memo(function NoteCanvas({
  canvasRef,
  gesture,
  inkPicture,
  livePath,
  scrollY,
  maxScroll,
  viewportWidth,
  viewportHeight,
  cursorX,
  cursorY,
  cursorOpacity,
  eraserOn,
}: NoteCanvasProps) {
  const cursorRadius = useDerivedValue(() =>
    eraserOn.value ? ERASE_RADIUS : PEN_CURSOR_RADIUS
  );
  const cursorDotRadius = useDerivedValue(() =>
    eraserOn.value ? ERASER_CURSOR_DOT_RADIUS : PEN_CURSOR_DOT_RADIUS
  );
  const cursorRingWidth = useDerivedValue(() =>
    eraserOn.value ? ERASER_CURSOR_RING_WIDTH : PEN_CURSOR_RING_WIDTH
  );

  // The page slides under a fixed window, and the marker on the right shows
  // where that window is. Both follow `scrollY` on the UI thread.
  const pageTransform = useDerivedValue(() => [{ translateY: -scrollY.value }]);

  const scrollbarLength = useDerivedValue(() => {
    const visible = viewportHeight.value;
    const range = maxScroll.value;
    if (range <= 0 || visible <= 0) return 0;

    const track = visible - SCROLLBAR_INSET * 2;
    return Math.max(SCROLLBAR_MIN_LENGTH, (track * visible) / (visible + range));
  });

  const scrollbarY = useDerivedValue(() => {
    const range = maxScroll.value;
    if (range <= 0) return 0;

    const travel = viewportHeight.value - SCROLLBAR_INSET * 2 - scrollbarLength.value;
    return SCROLLBAR_INSET + (Math.min(scrollY.value, range) / range) * travel;
  });

  const scrollbarX = useDerivedValue(
    () => viewportWidth.value - SCROLLBAR_WIDTH - SCROLLBAR_INSET
  );

  // Built once. Everything on the canvas moves through shared values, so it
  // never needs React to re-render it.
  const canvasContent = useMemo(
    () => (
      <>
        <Fill color={PAGE_COLOR} />
        <Group transform={pageTransform}>
          <Picture picture={inkPicture} />
          <Path
            path={livePath}
            color={STROKE_COLOR}
            style="stroke"
            strokeWidth={STROKE_WIDTH}
            strokeCap="round"
            strokeJoin="round"
          />
        </Group>
        <RoundedRect
          x={scrollbarX}
          y={scrollbarY}
          width={SCROLLBAR_WIDTH}
          height={scrollbarLength}
          r={SCROLLBAR_WIDTH / 2}
          color={SCROLLBAR_COLOR}
        />
        <Group opacity={cursorOpacity}>
          <Circle cx={cursorX} cy={cursorY} r={cursorRadius} color={CURSOR_FILL} />
          <Circle
            cx={cursorX}
            cy={cursorY}
            r={cursorRadius}
            color={CURSOR_RING}
            style="stroke"
            strokeWidth={cursorRingWidth}
          />
          <Circle cx={cursorX} cy={cursorY} r={cursorDotRadius} color={CURSOR_DOT} />
        </Group>
      </>
    ),
    [
      pageTransform,
      inkPicture,
      livePath,
      scrollbarX,
      scrollbarY,
      scrollbarLength,
      cursorOpacity,
      cursorX,
      cursorY,
      cursorRadius,
      cursorDotRadius,
      cursorRingWidth,
    ]
  );

  return (
    <GestureDetector gesture={gesture}>
      {/* Opaque puts the canvas on a SurfaceView on Android, which the system
          composites directly instead of through the app's own window: new ink
          reaches the screen a frame sooner. */}
      <Canvas style={styles.canvas} ref={canvasRef} opaque>
        {canvasContent}
      </Canvas>
    </GestureDetector>
  );
});

/** The finished ink of one page at one moment: the three per-stroke lists, in step. */
interface InkSnapshot {
  paths: SkPath[];
  strokes: InkStroke[];
  pathData: string[];
}

interface Page {
  ink: InkSnapshot;
  /** Earlier states of this page's ink, newest last. Kept for the session only. */
  undo: InkSnapshot[];
  /** How far down the page was scrolled when it was last on screen. */
  scrollY: number;
}

function blankPage(): Page {
  return { ink: EMPTY_INK, undo: [], scrollY: 0 };
}

/**
 * Rebuilds a stored page for the canvas. A stroke whose path no longer parses
 * is dropped along with its points, so the lists stay in step.
 */
function loadPage({ paths, strokes }: NotePage): Page {
  const ink: InkSnapshot = { paths: [], strokes: [], pathData: [] };

  paths.forEach((data, index) => {
    const path = Skia.Path.MakeFromSVGString(data);
    const stroke = strokes[index];
    if (!path || !stroke) return;

    ink.paths.push(path);
    ink.strokes.push(stroke);
    ink.pathData.push(data);
  });

  return { ink, undo: [], scrollY: 0 };
}

/** How far down the page the ink reaches, in page coordinates; 0 when blank. */
function inkBottom(paths: SkPath[]) {
  let bottom = 0;
  for (const path of paths) {
    const bounds = path.getBounds();
    bottom = Math.max(bottom, bounds.y + bounds.height);
  }
  return bottom > 0 ? bottom + STROKE_WIDTH : 0;
}

/** A stroke the UI thread is drawing, or has drawn and JS has yet to take. */
interface PendingStroke {
  id: number;
  points: InkPoint[];
  /** False while the pen is still on the page. */
  finished: boolean;
}

/**
 * Extends a stroke to its next sample: a quadratic curve through the midpoint,
 * anchored on the previous sample, so fast strokes come out smooth instead of
 * faceted.
 */
function traceSegment(path: SkPath, from: InkPoint, to: InkPoint) {
  'worklet';
  path.quadTo(from.x, from.y, (from.x + to.x) / 2, (from.y + to.y) / 2);
}

/**
 * Traces a whole stroke through its samples. Runs on both threads — the UI
 * thread rebuilding the live ink, JS producing the stroke it keeps — so the
 * two always agree to the pixel.
 */
function traceStroke(path: SkPath, points: InkPoint[], finished: boolean) {
  'worklet';
  if (points.length === 0) return;

  path.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index++) {
    traceSegment(path, points[index - 1], points[index]);
  }

  // The curve stops at the last midpoint, so close the remaining gap. A lone
  // tap becomes a zero-length line, which the round cap draws as a dot.
  if (finished) {
    const last = points[points.length - 1];
    path.lineTo(last.x, last.y);
  }
}

// Must draw exactly like the live <Path> on the canvas, or a stroke would
// visibly shift the moment the pen lifts and it moves into the picture.
let inkPaint: SkPaint | null = null;

function recordInk(paths: SkPath[]): SkPicture {
  if (!inkPaint) {
    inkPaint = Skia.Paint();
    inkPaint.setAntiAlias(true);
    inkPaint.setColor(Skia.Color(STROKE_COLOR));
    inkPaint.setStyle(PaintStyle.Stroke);
    inkPaint.setStrokeWidth(STROKE_WIDTH);
    inkPaint.setStrokeCap(StrokeCap.Round);
    inkPaint.setStrokeJoin(StrokeJoin.Round);
  }

  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording();
  for (const path of paths) canvas.drawPath(path, inkPaint);
  const picture = recorder.finishRecordingAsPicture();
  recorder.dispose();
  return picture;
}

function openedMessage(note: StoredNote) {
  return note.preview ? `Opened "${note.preview}"` : 'Opened note';
}

// The resting hint depends on whether a note has been started and whether the
// eraser is on, so the two are resolved in one place.
function idleMessage(hasAuthor: boolean, isErasing: boolean) {
  if (!hasAuthor) return NEEDS_AUTHOR_MESSAGE;
  return isErasing ? ERASING_MESSAGE : READY_MESSAGE;
}

/** A straight stretch from (ax, ay) to (bx, by). */
interface Segment {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// Strokes are never edited once finished, so each one's box is worked out
// once and kept for as long as the stroke itself is.
const strokeBoundsCache = new WeakMap<InkStroke, Bounds>();

function strokeBounds(stroke: InkStroke): Bounds {
  let bounds = strokeBoundsCache.get(stroke);
  if (!bounds) {
    bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (const { x, y } of stroke.points) {
      bounds.minX = Math.min(bounds.minX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.maxY = Math.max(bounds.maxY, y);
    }
    strokeBoundsCache.set(stroke, bounds);
  }
  return bounds;
}

/**
 * Whether the eraser, moving along `sweep`, passed over any part of a stroke.
 * Sampled points alone are not enough — a fast stroke leaves them far apart —
 * so each stretch between two samples is measured as a line, against the
 * eraser's path as a line too.
 */
function strokeTouches(stroke: InkStroke, sweep: Segment) {
  const { points } = stroke;
  if (points.length === 0) return false;

  // Most strokes on a page are nowhere near the eraser; a box check rules
  // them out before any of their points are looked at.
  const box = strokeBounds(stroke);
  if (
    Math.max(sweep.ax, sweep.bx) < box.minX - ERASE_REACH ||
    Math.min(sweep.ax, sweep.bx) > box.maxX + ERASE_REACH ||
    Math.max(sweep.ay, sweep.by) < box.minY - ERASE_REACH ||
    Math.min(sweep.ay, sweep.by) > box.maxY + ERASE_REACH
  ) {
    return false;
  }

  if (points.length === 1) {
    return distanceToSegment(points[0].x, points[0].y, sweep.ax, sweep.ay, sweep.bx, sweep.by) <= ERASE_REACH;
  }

  for (let index = 1; index < points.length; index++) {
    const start = points[index - 1];
    const end = points[index];
    if (distanceBetweenSegments(start.x, start.y, end.x, end.y, sweep) <= ERASE_REACH) return true;
  }
  return false;
}

/** The shortest distance between the stretch (ax, ay)–(bx, by) and `other`. */
function distanceBetweenSegments(ax: number, ay: number, bx: number, by: number, other: Segment) {
  const { ax: cx, ay: cy, bx: dx, by: dy } = other;

  // Crossing lines are no distance apart at all.
  const abSidesDiffer = side(ax, ay, bx, by, cx, cy) > 0 !== side(ax, ay, bx, by, dx, dy) > 0;
  const cdSidesDiffer = side(cx, cy, dx, dy, ax, ay) > 0 !== side(cx, cy, dx, dy, bx, by) > 0;
  if (abSidesDiffer && cdSidesDiffer) return 0;

  // Otherwise the closest approach is always from one of the four ends.
  return Math.min(
    distanceToSegment(ax, ay, cx, cy, dx, dy),
    distanceToSegment(bx, by, cx, cy, dx, dy),
    distanceToSegment(cx, cy, ax, ay, bx, by),
    distanceToSegment(dx, dy, ax, ay, bx, by)
  );
}

/** Which side of the line through (ax, ay)→(bx, by) the point (x, y) is on. */
function side(ax: number, ay: number, bx: number, by: number, x: number, y: number) {
  return (bx - ax) * (y - ay) - (by - ay) * (x - ax);
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

interface IconButtonProps {
  /** Announced rather than drawn: these buttons are icons only. */
  label: string;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

function IconButton({
  label,
  icon,
  active = false,
  disabled = false,
  onPress,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        style,
        active && styles.iconButtonActive,
        disabled && styles.iconButtonDisabled,
        pressed && onPress && styles.iconButtonPressed,
      ]}>
      {icon}
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
  toolbarButtons: {
    flexDirection: 'row',
    gap: 8,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  pager: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  pagerLabel: {
    color: STROKE_COLOR,
    fontSize: 12,
    fontWeight: '600',
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    padding: 8,
  },
  iconButtonActive: {
    backgroundColor: '#EEF2F7',
  },
  iconButtonDisabled: {
    opacity: 0.35,
  },
  iconButtonPressed: {
    opacity: 0.6,
  },
  canvasWrapper: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  // Clear of the scroll marker on the right edge, and of the bottom nav.
  scrollButtons: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    gap: 10,
  },
  scrollButton: {
    backgroundColor: SURFACE_COLOR,
    borderColor: BORDER_COLOR,
    borderRadius: 22,
    borderWidth: 1,
    elevation: 3,
    height: 44,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    width: 44,
  },
  loadingCover: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    backgroundColor: PAGE_COLOR,
    justifyContent: 'center',
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
    flex: 1,
    fontSize: 12,
  },
  linkText: {
    color: ACCENT_COLOR,
    fontSize: 12,
    fontWeight: '600',
  },
});
