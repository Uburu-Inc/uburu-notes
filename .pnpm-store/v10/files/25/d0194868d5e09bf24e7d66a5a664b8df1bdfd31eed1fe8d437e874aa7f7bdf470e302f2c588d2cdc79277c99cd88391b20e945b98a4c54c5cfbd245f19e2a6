import type { HybridObject } from "react-native-nitro-modules";

/** A single sampled point of a stroke, in your canvas' coordinate space. */
export interface InkPoint {
  x: number;
  y: number;
  /**
   * Optional timestamp in milliseconds (e.g. `Date.now()`), relative or
   * absolute. Providing it improves recognition accuracy.
   */
  t?: number;
}

/** One continuous stroke (pen-down → pen-up), as its sampled points. */
export interface InkStroke {
  points: InkPoint[];
}

/** A candidate transcription of the ink, best first. */
export interface RecognitionCandidate {
  text: string;
  /** Model score if the model provides one (may be undefined). */
  score?: number;
}

/**
 * On-device handwriting / drawing recognition powered by Google ML Kit.
 * Feed it the strokes the user drew (points with optional timestamps) and a
 * BCP-47 language tag; get back candidate transcriptions. The per-language
 * model downloads at runtime on first use. All recognition is on-device.
 */
export interface DigitalInkRecognizer extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  /**
   * Recognize handwriting from ink strokes. `languageTag` is a tag ML Kit
   * supports (e.g. "en-US", "es-ES", "fr-FR", "zh-Hani", "emoji"). Downloads the
   * model on first use.
   */
  recognize(strokes: InkStroke[], languageTag: string): Promise<RecognitionCandidate[]>;

  /** Download a language model ahead of time. */
  downloadModel(languageTag: string): Promise<void>;
  /** Whether a language model is already downloaded. */
  isModelDownloaded(languageTag: string): Promise<boolean>;
  /** Delete a downloaded language model. */
  deleteModel(languageTag: string): Promise<void>;

  isAvailable(): boolean;
}
