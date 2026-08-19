export { type DigitalInkRecognizer } from "./specs/DigitalInkRecognizer.nitro";
export type {
  InkPoint,
  InkStroke,
  RecognitionCandidate,
} from "./specs/DigitalInkRecognizer.nitro";

import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { NitroModules } from "react-native-nitro-modules";
import type { DigitalInkRecognizer } from "./specs/DigitalInkRecognizer.nitro";

if (Platform.OS === "android") {
  requireOptionalNativeModule("NitroMLKitDigitalInk");
}

/** The shared DigitalInkRecognizer instance. */
export const NitroDigitalInk =
  NitroModules.createHybridObject<DigitalInkRecognizer>("DigitalInkRecognizer");
