import type { DigitalInkRecognizer, InkStroke } from '@nitro-mlkit/digital-ink';

export const RECOGNITION_LANGUAGE = 'en-US';

export class RecognitionUnavailableError extends Error {
  constructor() {
    super(
      'On-device handwriting recognition is not in this build. Stop Metro, then run ' +
        '`npx expo prebuild --clean` and `npx expo run:android`.'
    );
    this.name = 'RecognitionUnavailableError';
  }
}

// `NitroDigitalInk` builds its hybrid object at import time and throws when the
// native side is missing (Expo Go, or a build made before `expo prebuild`), so
// it is loaded on demand. A plain require is deliberate: `import()` resolves to
// a numeric Metro module id, which fails as an opaque "unknown module" error.
let cached: DigitalInkRecognizer | null | undefined;

function getRecognizer() {
  if (cached !== undefined) return cached;
  try {
    const module = require('@nitro-mlkit/digital-ink') as {
      NitroDigitalInk?: DigitalInkRecognizer;
    };
    cached = module.NitroDigitalInk ?? null;
  } catch (error) {
    console.warn('Handwriting recognition unavailable:', error);
    cached = null;
  }
  return cached;
}

export function isRecognitionAvailable() {
  const recognizer = getRecognizer();
  if (!recognizer) return false;
  try {
    return recognizer.isAvailable();
  } catch {
    return false;
  }
}

/**
 * Turns ink strokes into text. The per-language ML Kit model downloads on first
 * use, so the very first call needs a network connection and may be slow.
 */
export async function recognizeHandwriting(
  strokes: InkStroke[],
  languageTag: string = RECOGNITION_LANGUAGE
): Promise<string> {
  const recognizer = getRecognizer();
  if (!recognizer) throw new RecognitionUnavailableError();

  if (strokes.length === 0) return '';

  if (!(await recognizer.isModelDownloaded(languageTag))) {
    await recognizer.downloadModel(languageTag);
  }

  const candidates = await recognizer.recognize(strokes, languageTag);
  return candidates[0]?.text ?? '';
}
