"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createFrameScope = void 0;
const isDisposable = value => {
  "worklet";

  return value !== null && typeof value === "object" && typeof value.dispose === "function";
};
/**
 * Wraps a Skia instance so that every object created through its factories is
 * collected and deleted when the scope is disposed. The renderer only keeps
 * the objects it creates alive for the duration of a frame: once the frame
 * has been recorded they can be deleted. This is required on Web where
 * CanvasKit objects live in WASM memory that the JS garbage collector does
 * not perceive, so it (almost) never reclaims them on its own.
 *
 * Objects passed in via props are user-owned: they are not created through
 * this facade and are therefore never tracked nor disposed.
 */
const createFrameScope = Skia => {
  "worklet";

  const disposables = [];
  const track = value => {
    if (isDisposable(value)) {
      disposables.push(value);
    }
    return value;
  };
  const wrap = obj => {
    const cache = new Map();
    return new Proxy(obj, {
      get(target, prop) {
        if (cache.has(prop)) {
          return cache.get(prop);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = target[prop];
        let wrapped = value;
        if (typeof value === "function") {
          wrapped = (...args) => track(value.apply(target, args));
        } else if (value !== null && typeof value === "object") {
          wrapped = wrap(value);
        }
        cache.set(prop, wrapped);
        return wrapped;
      }
    });
  };
  const dispose = () => {
    for (let i = 0; i < disposables.length; i++) {
      disposables[i].dispose();
    }
    disposables.length = 0;
  };
  return {
    Skia: wrap(Skia),
    track,
    dispose
  };
};
exports.createFrameScope = createFrameScope;
//# sourceMappingURL=FrameScope.js.map