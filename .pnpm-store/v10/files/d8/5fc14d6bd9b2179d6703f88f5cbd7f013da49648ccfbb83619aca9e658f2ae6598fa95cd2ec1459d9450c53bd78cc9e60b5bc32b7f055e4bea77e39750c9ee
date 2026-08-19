function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
import { Recorder, disposeRecording } from "./Recorder/Recorder";
import { visit } from "./Recorder/Visitor";
import { replay } from "./Recorder/Player";
import { createDrawingContext } from "./Recorder/DrawingContext";
import "../views/api";
export class Container {
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
    const ctx = createDrawingContext(this.Skia, this.recording.paintPool, canvas);
    try {
      replay(ctx, this.recording.commands);
    } finally {
      // Frame-scoped objects created during the replay are no longer needed
      // once drawn — delete them, otherwise they leak on Web where the GC
      // cannot see WASM memory.
      ctx.dispose();
    }
  }
}
export class StaticContainer extends Container {
  constructor(Skia, nativeId) {
    super(Skia);
    this.nativeId = nativeId;
  }
  unmount() {
    super.unmount();
    if (this.recording) {
      disposeRecording(this.recording);
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
      disposeRecording(this.recording);
      this.recording = null;
    }
    const recorder = new Recorder();
    visit(recorder, this.root);
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
//# sourceMappingURL=StaticContainer.js.map