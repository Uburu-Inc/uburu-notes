import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, type LayoutChangeEvent } from 'react-native';
import { Canvas, Path, Skia, useCanvasRef, type SkPath } from '@shopify/react-native-skia';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import type { InkPoint, InkStroke } from '@nitro-mlkit/digital-ink';
import {
  buildSvg,
  forgetFolder,
  saveTextNote,
  saveTextNoteToAppStorage,
  PAGE_COLOR,
  STROKE_COLOR,
  STROKE_WIDTH,
} from '../../lib/notes';
import {
  RecognitionUnavailableError,
  isRecognitionAvailable,
  recognizeHandwriting,
} from '../../lib/recognize';

const READY_MESSAGE = 'Write something, then save it as text';
const REBUILD_MESSAGE = 'Recognition missing from this build — run npx expo prebuild, then rebuild';

export function Note() {
  const canvasRef = useCanvasRef();

  const [completedPaths, setCompletedPaths] = useState<SkPath[]>([]);
  const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [canRecognize, setCanRecognize] = useState(true);
  const [status, setStatus] = useState(READY_MESSAGE);

  // The SVG needs concrete dimensions, and Canvas.onLayout is deprecated under
  // Fabric, so the size comes from the wrapper instead.
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // The in-progress stroke lives in a ref so each gesture event reads the
  // latest path without depending on render timing; state only mirrors it.
  const activePath = useRef<SkPath | null>(null);
  const prev = useRef({ x: 0, y: 0 });

  // Skia paths draw the ink, but ML Kit needs the raw sampled points, so both
  // are recorded per stroke and kept in step.
  const activePoints = useRef<InkPoint[]>([]);
  const completedStrokes = useRef<InkStroke[]>([]);

  // runOnJS keeps these callbacks off the UI thread so they can drive React
  // state; without it they would be workletized as soon as Reanimated is added.
  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .minDistance(0)
    .runOnJS(true)
    .onStart((g) => {
      const path = Skia.Path.Make();
      path.moveTo(g.x, g.y);
      prev.current = { x: g.x, y: g.y };
      activePath.current = path;
      activePoints.current = [{ x: g.x, y: g.y, t: Date.now() }];
      setCurrentPath(path);
    })
    .onUpdate((g) => {
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
      const path = activePath.current;
      if (!path) return;

      // The curve stops at the last midpoint, so close the remaining gap.
      path.lineTo(prev.current.x, prev.current.y);
      activePath.current = null;

      completedStrokes.current.push({ points: activePoints.current });
      activePoints.current = [];

      setCompletedPaths((paths) => [...paths, path]);
      setCurrentPath(null);
    });

  const clearNote = () => {
    activePath.current = null;
    activePoints.current = [];
    completedStrokes.current = [];
    setCompletedPaths([]);
    setCurrentPath(null);
    setStatus(canRecognize ? READY_MESSAGE : REBUILD_MESSAGE);
  };

  // Probe once on mount so a missing native module is obvious before the user
  // draws a whole note and only then finds out it cannot be saved.
  useEffect(() => {
    const available = isRecognitionAvailable();
    setCanRecognize(available);
    setStatus(available ? READY_MESSAGE : REBUILD_MESSAGE);
  }, []);

  const changeFolder = () => {
    forgetFolder();
    setStatus('Next save will ask for a folder');
    Alert.alert(
      'Choose a folder',
      'The next save will ask where to put your notes.\n\n' +
        'Android does not allow granting the top level of internal storage, so open a ' +
        'folder such as Documents or Download first, then tap "Use this folder".'
    );
  };

  const handleCanvasLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCanvasSize({ width, height });
  };

  const saveNoteAsText = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      setStatus('Reading your handwriting...');
      const text = await recognizeHandwriting(completedStrokes.current);

      if (!text.trim()) {
        setStatus('Could not read that');
        Alert.alert(
          'Nothing recognised',
          'The handwriting could not be read as text. Try writing larger, or more clearly.'
        );
        return;
      }

      const svg = buildSvg(completedPaths, canvasSize.width, canvasSize.height);

      setStatus('Saving...');
      let result;
      try {
        result = await saveTextNote({ text, svg });
      } catch (pickError) {
        // Picker cancelled or no folder granted: keep the note rather than lose it.
        console.warn('No shared folder granted, using app storage:', pickError);
        result = saveTextNoteToAppStorage({ text, svg });
      }

      setStatus(`Saved "${text}" to ${result.baseName}.txt`);
      Alert.alert(
        'Saved as text',
        `Recognised:\n"${text}"\n\nSaved as ${result.baseName}.txt` +
          (result.isSharedLocation
            ? ''
            : '\n\nNo folder was granted, so this went to app-private storage, which your ' +
              'computer cannot see. Tap "Change folder" and pick Documents or Download.')
      );
    } catch (error) {
      console.error(error);
      setStatus('Save failed');
      Alert.alert(
        'Error',
        error instanceof RecognitionUnavailableError
          ? error.message
          : 'Failed to save your note as text.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const renderPaths = currentPath ? [...completedPaths, currentPath] : completedPaths;
  const isEmpty = renderPaths.length === 0;

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.canvasWrapper} onLayout={handleCanvasLayout}>
        <GestureDetector gesture={panGesture}>
          <Canvas style={styles.canvas} ref={canvasRef}>
            {renderPaths.map((path, index) => (
              <Path
                key={index}
                path={path}
                color={STROKE_COLOR}
                style="stroke"
                strokeWidth={STROKE_WIDTH}
                strokeCap="round"
                strokeJoin="round"
              />
            ))}
          </Canvas>
        </GestureDetector>
      </View>

      <View style={styles.controlPanel}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.clearButton, isEmpty && styles.buttonDisabled]}
            onPress={clearNote}
            disabled={isEmpty}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.saveButton,
              (isEmpty || isSaving || !canRecognize) && styles.buttonDisabled,
            ]}
            onPress={saveNoteAsText}
            disabled={isEmpty || isSaving || !canRecognize}>
            <Text style={styles.saveText}>{isSaving ? 'Working...' : 'Save as .txt'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.savedSummary} numberOfLines={2}>
          {status}
        </Text>

        <TouchableOpacity onPress={changeFolder} disabled={isSaving}>
          <Text style={styles.linkText}>Change folder</Text>
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAGE_COLOR,
  },
  canvasWrapper: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  controlPanel: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  savedSummary: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  clearButton: {
    backgroundColor: '#EEF2F7',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  clearText: {
    color: '#1E1E24',
    fontSize: 16,
    fontWeight: '600',
  },
  saveText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
