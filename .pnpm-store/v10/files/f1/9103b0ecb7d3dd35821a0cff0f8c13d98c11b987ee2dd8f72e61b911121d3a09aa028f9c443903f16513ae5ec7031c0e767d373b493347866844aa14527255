"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createFrameScope = void 0;
/**
 * No-op on native. The JSI wrappers report the size of the native objects
 * they hold to the garbage collector (setExternalMemoryPressure), so the GC
 * is aware of the real cost of the objects the renderer creates and reclaims
 * them on its own. The tracking scope is only needed on Web, where CanvasKit
 * objects live in WASM memory the GC cannot see (see FrameScope.ts).
 */
const createFrameScope = Skia => {
  "worklet";

  return {
    Skia,
    track: value => value,
    dispose: () => {
      // nothing to dispose: no objects are tracked on native
    }
  };
};
exports.createFrameScope = createFrameScope;
//# sourceMappingURL=FrameScope.native.js.map