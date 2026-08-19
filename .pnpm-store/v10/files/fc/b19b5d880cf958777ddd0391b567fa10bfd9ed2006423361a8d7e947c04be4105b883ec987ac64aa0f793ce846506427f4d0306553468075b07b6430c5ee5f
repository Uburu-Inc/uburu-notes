"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.unwrapModule = exports.isRNModule = void 0;
const isRNModule = mod => typeof mod === "number";

// Since Expo SDK 52, on web, require() may return an ES module interop
// object ({ default: <asset> }) instead of the asset itself.
// See https://github.com/Shopify/react-native-skia/issues/2784
exports.isRNModule = isRNModule;
const unwrapModule = mod => typeof mod === "object" && mod !== null && "default" in mod ? mod.default : mod;
exports.unwrapModule = unwrapModule;
//# sourceMappingURL=Data.js.map