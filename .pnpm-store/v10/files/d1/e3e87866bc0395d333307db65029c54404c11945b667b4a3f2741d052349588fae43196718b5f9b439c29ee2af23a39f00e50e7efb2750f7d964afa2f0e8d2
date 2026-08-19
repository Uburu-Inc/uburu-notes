# React Native ML Kit — Digital Ink Recognition

**`@nitro-mlkit/digital-ink`** · on-device Google ML Kit via [Nitro Modules](https://github.com/mrousavy/nitro) — JSI, no bridge.

> ⚠️ **Beta (`0.1.0-beta.x`).** Android verified on-device. iOS builds & links
> but device runtime is pending — see [Platform status](#platform-status).

High-performance, on-device **handwriting / digital-ink recognition** for React
Native, built with [Nitro Modules](https://github.com/mrousavy/nitro) (JSI, no bridge).

Powered by **Google ML Kit**. Feed it the **strokes** the user drew (points with
optional timestamps) and a language tag; get back candidate transcriptions.
300+ languages, plus autodraw/shapes and emoji. The per-language model
**downloads at runtime** on first use. **All on-device.**

## Installation

```bash
npm install @nitro-mlkit/digital-ink@beta react-native-nitro-modules
```

No config plugin (autolinked Expo module). Install and `npx expo prebuild`.
Not available in Expo Go.

## Usage

```ts
import { NitroDigitalInk, type InkStroke } from "@nitro-mlkit/digital-ink";

// Collect strokes from your canvas (e.g. via PanResponder). Each stroke is the
// list of points between pen-down and pen-up. Timestamps (t) are optional but
// improve accuracy.
const strokes: InkStroke[] = [
  { points: [ { x: 10, y: 20, t: 0 }, { x: 12, y: 22, t: 16 }, /* … */ ] },
];

const candidates = await NitroDigitalInk.recognize(strokes, "en-US");
// → [{ text: "hello", score: … }, { text: "helio", … }, …]  (best first)

// Model management
await NitroDigitalInk.downloadModel("es-ES");
await NitroDigitalInk.isModelDownloaded("es-ES"); // boolean
await NitroDigitalInk.deleteModel("es-ES");

NitroDigitalInk.isAvailable(); // boolean
```

Language tags follow ML Kit's identifiers (e.g. `"en-US"`, `"es-ES"`, `"fr-FR"`,
`"zh-Hani"`, `"emoji"`).

## Platform status

| Platform | Min | Status |
| -------- | --- | ------ |
| Android  | API 26+ | ✅ Verified on-device (Pixel 9, API 36) |
| iOS      | 15.5+   | ⚠️ Swift impl written; on-device build & run pending¹ |
| tvOS/macOS | — | 🔜 Planned |

¹ ML Kit's iOS pods ship no `arm64` Simulator slice; validate on a physical device.

## Part of `nitro-mlkit`

The full ML Kit suite on Nitro — see the other `@nitro-mlkit/*` packages.

## License

MIT © Gonzalo Polo
