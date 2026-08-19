"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.StaticContainer = exports.Container = void 0;
var _Recorder = require("./Recorder/Recorder");
var _Visitor = require("./Recorder/Visitor");
var _Player = require("./Recorder/Player");
var _DrawingContext = require("./Recorder/DrawingContext");
require("../views/api");
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
class Container {
  constructor(Skia) {
    this.Skia = Skia;
    _defineProperty(this, "_root", []);
    _defineProperty(this, "recording", null);
    _defineProperty(this, "unmounted", false);
  }
  get root() {
    return this._root;
  }
  set root(value) {
    this._root = value;
  }
  mount() {
    this.unmounted = false;
  }
  unmount() {
    this.unmounted = true;
  }
  drawOnCanvas(canvas) {
    if (!this.recording) {
      throw new Error("No recording to draw");
    }
    const ctx = (0, _DrawingContext.createDrawingContext)(this.Skia, this.recording.paintPool, canvas);
    try {
      (0, _Player.replay)(ctx, this.recording.commands);
    } finally {
      // Frame-scoped objects created during the replay are no longer needed
      // once drawn — delete them, otherwise they leak on Web where the GC
      // cannot see WASM memory.
      ctx.dispose();
    }
  }
}
exports.Container = Container;
class StaticContainer extends Container {
  constructor(Skia, nativeId) {
    super(Skia);
    this.nativeId = nativeId;
  }
  unmount() {
    super.unmount();
    if (this.recording) {
      (0, _Recorder.disposeRecording)(this.recording);
      this.recording = null;
    }
  }
  redraw() {
    if (this.unmounted) {
      // The unmount commit triggers a last redraw — recording it would
      // resurrect a recording for a container that has just disposed it.
      return;
    }
    if (this.recording) {
      (0, _Recorder.disposeRecording)(this.recording);
      this.recording = null;
    }
    const recorder = new _Recorder.Recorder();
    (0, _Visitor.visit)(recorder, this.root);
    this.recording = recorder.getRecording();
    const isOnScreen = this.nativeId !== -1;
    if (isOnScreen) {
      const rec = this.Skia.PictureRecorder();
      const canvas = rec.beginRecording();
      this.drawOnCanvas(canvas);
      const picture = rec.finishRecordingAsPicture();
      rec.dispose();
      SkiaViewApi.setJsiProperty(this.nativeId, "picture", picture);
      // The view keeps its own reference to the picture it displays; this
      // one is renderer-owned and disposed with the recording.
      this.recording.lastPicture = picture;
    }
  }
}
exports.StaticContainer = StaticContainer;
//# sourceMappingURL=StaticContainer.js.map