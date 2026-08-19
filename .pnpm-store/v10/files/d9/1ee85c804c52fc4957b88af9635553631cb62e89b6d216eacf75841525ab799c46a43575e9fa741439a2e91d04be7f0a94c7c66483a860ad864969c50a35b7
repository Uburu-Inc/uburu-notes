"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createContainer = void 0;
var _ReanimatedProxy = _interopRequireDefault(require("../external/reanimated/ReanimatedProxy"));
var _renderHelpers = require("../external/reanimated/renderHelpers");
var _Recorder = require("./Recorder/Recorder");
var _Visitor = require("./Recorder/Visitor");
var _Player = require("./Recorder/Player");
var _DrawingContext = require("./Recorder/DrawingContext");
var _StaticContainer = require("./StaticContainer");
require("../skia/NativeSetup");
require("../views/api");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
// create local reference for `strictGlobal` option in Worklets
const {
  SkiaViewApi
} = globalThis;
const drawOnscreen = (Skia, nativeId, recording) => {
  "worklet";

  var _recording$lastPictur;
  const rec = Skia.PictureRecorder();
  const canvas = rec.beginRecording();
  //const start = performance.now();

  const ctx = (0, _DrawingContext.createDrawingContext)(Skia, recording.paintPool, canvas);
  let picture;
  try {
    (0, _Player.replay)(ctx, recording.commands);
    picture = rec.finishRecordingAsPicture();
  } finally {
    // Frame-scoped objects (shaders, filters, paint copies, ...) are
    // referenced by the picture once it is finished — delete the JS handles,
    // otherwise they leak on Web where the GC cannot see WASM memory.
    ctx.dispose();
    rec.dispose();
  }
  //const end = performance.now();
  //console.log("Recording time: ", end - start);
  SkiaViewApi.setJsiProperty(nativeId, "picture", picture);
  // The view now references the new picture; the previous one is ours to
  // delete.
  (_recording$lastPictur = recording.lastPicture) === null || _recording$lastPictur === void 0 || _recording$lastPictur.dispose();
  recording.lastPicture = picture;
};
class ReanimatedContainer extends _StaticContainer.Container {
  constructor(Skia, nativeId) {
    super(Skia);
    this.nativeId = nativeId;
    _defineProperty(this, "mapperId", null);
  }
  unmount() {
    super.unmount();
    if (this.mapperId !== null) {
      // The mapper closure retains the recording and keeps updating the
      // picture of an unmounted view — stop it or it leaks for the
      // lifetime of the app.
      _ReanimatedProxy.default.stopMapper(this.mapperId);
      this.mapperId = null;
    }
    const {
      recording
    } = this;
    if (recording) {
      this.recording = null;
      // Deferred through the same channel as the draw calls so it runs after
      // any of them that are still queued.
      _ReanimatedProxy.default.runOnUI(() => {
        "worklet";

        (0, _Recorder.disposeRecording)(recording);
      })();
    }
  }
  redraw() {
    if (this.mapperId !== null) {
      _ReanimatedProxy.default.stopMapper(this.mapperId);
      this.mapperId = null;
    }
    if (this.unmounted) {
      return;
    }
    const previousRecording = this.recording;
    const recorder = new _Recorder.Recorder();
    (0, _Visitor.visit)(recorder, this.root);
    const record = recorder.getRecording();
    const {
      animationValues
    } = record;
    this.recording = {
      commands: record.commands,
      paintPool: record.paintPool
    };
    const {
      nativeId,
      Skia,
      recording
    } = this;
    if (animationValues.size > 0) {
      this.mapperId = _ReanimatedProxy.default.startMapper(() => {
        "worklet";

        drawOnscreen(Skia, nativeId, recording);
      }, Array.from(animationValues));
    }
    _ReanimatedProxy.default.runOnUI(() => {
      "worklet";

      if (previousRecording) {
        // Runs after any still-queued draw of the previous recording.
        (0, _Recorder.disposeRecording)(previousRecording);
      }
      drawOnscreen(Skia, nativeId, recording);
    })();
  }
}
const createContainer = (Skia, nativeId) => {
  if (_renderHelpers.HAS_REANIMATED_3 && nativeId !== -1) {
    return new ReanimatedContainer(Skia, nativeId);
  } else {
    return new _StaticContainer.StaticContainer(Skia, nativeId);
  }
};
exports.createContainer = createContainer;
//# sourceMappingURL=Container.web.js.map