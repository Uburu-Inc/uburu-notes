export const isRNModule = mod => typeof mod === "number";

// Since Expo SDK 52, on web, require() may return an ES module interop
// object ({ default: <asset> }) instead of the asset itself.
// See https://github.com/Shopify/react-native-skia/issues/2784
export const unwrapModule = mod => typeof mod === "object" && mod !== null && "default" in mod ? mod.default : mod;
//# sourceMappingURL=Data.js.map