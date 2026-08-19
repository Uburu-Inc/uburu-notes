"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Platform = void 0;
var _reactNative = require("react-native");
var _types = require("../skia/types");
const Platform = exports.Platform = {
  OS: _reactNative.Platform.OS,
  PixelRatio: _reactNative.PixelRatio.get(),
  resolveAsset: source => {
    const asset = (0, _types.unwrapModule)(source);
    if (typeof asset === "string") {
      return asset;
    }
    return (0, _types.isRNModule)(asset) ? _reactNative.Image.resolveAssetSource(asset).uri : asset.uri;
  },
  findNodeHandle: _reactNative.findNodeHandle,
  View: _reactNative.View
};
//# sourceMappingURL=Platform.js.map