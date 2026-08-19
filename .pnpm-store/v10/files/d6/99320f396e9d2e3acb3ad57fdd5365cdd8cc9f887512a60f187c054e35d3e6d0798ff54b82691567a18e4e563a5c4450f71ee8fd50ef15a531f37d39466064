"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.JsiSkNativeBufferFactory = void 0;
var _Host = require("./Host");
class JsiSkNativeBufferFactory extends _Host.Host {
  constructor(CanvasKit) {
    super(CanvasKit);
  }
  MakeFromImage(image) {
    const info = image.getImageInfo();
    const uint8ClampedArray = new Uint8ClampedArray(image.readPixels());
    const imageData = new ImageData(uint8ClampedArray, info.width, info.height);
    const canvas = new OffscreenCanvas(info.width, info.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2d context from canvas");
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }
  MakeTestBuffer(width, height) {
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        pixels[i + 0] = Math.floor(x * 255 / Math.max(width - 1, 1));
        pixels[i + 1] = Math.floor(y * 255 / Math.max(height - 1, 1));
        pixels[i + 2] = x + y & 0x20 ? 220 : 30;
        pixels[i + 3] = 0xff;
      }
    }
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2d context from canvas");
    }
    ctx.putImageData(new ImageData(pixels, width, height), 0, 0);
    return canvas;
  }
  Release(_nativeBuffer) {
    // it's a noop on Web
  }
}
exports.JsiSkNativeBufferFactory = JsiSkNativeBufferFactory;
//# sourceMappingURL=JsiSkNativeBufferFactory.js.map