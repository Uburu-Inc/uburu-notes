"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createContainer = void 0;
var _ReanimatedProxy = _interopRequireDefault(require("../external/reanimated/ReanimatedProxy"));
var _renderHelpers = require("../external/reanimated/renderHelpers");
var _ReanimatedRecorder = require("./Recorder/ReanimatedRecorder");
var _StaticContainer = require("./StaticContainer");
var _Visitor = require("./Recorder/Visitor");
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
const nativeDrawOnscreen = (nativeId, recorder, picture) => {
  "worklet";

  //const start = performance.now();
  recorder.play(picture);
  //const end = performance.now();
  //console.log("Recording time: ", end - start);
  SkiaViewApi.setJsiProperty(nativeId, "picture", picture);
};
class NativeReanimatedContainer extends _StaticContainer.Container {
  constructor(Skia, nativeId) {
    super(Skia);
    this.nativeId = nativeId;
    _defineProperty(this, "mapperId", null);
    _defineProperty(this, "picture", void 0);
    this.picture = Skia.Picture.MakePicture(null);
  }
  unmount() {
    super.unmount();
    if (this.mapperId !== null) {
      // The mapper closure retains the recorder and its resources (e.g.
      // images) on the UI runtime and keeps updating the picture of an
      // unmounted view — stop it or it leaks for the lifetime of the app.
      _ReanimatedProxy.default.stopMapper(this.mapperId);
      this.mapperId = null;
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
    const recorder = new _ReanimatedRecorder.ReanimatedRecorder(this.Skia);
    const {
      nativeId,
      picture
    } = this;
    (0, _Visitor.visit)(recorder, this.root);
    const sharedValues = recorder.getSharedValues();
    const sharedRecorder = recorder.getRecorder();
    // Draw first frame
    _ReanimatedProxy.default.runOnUI(() => {
      "worklet";

      nativeDrawOnscreen(nativeId, sharedRecorder, picture);
    })();
    // Animate
    if (sharedValues.length > 0) {
      this.mapperId = _ReanimatedProxy.default.startMapper(() => {
        "worklet";

        sharedRecorder.applyUpdates(sharedValues);
        nativeDrawOnscreen(nativeId, sharedRecorder, picture);
      }, sharedValues);
    }
  }
}
let hasWarnedAboutReanimatedSupport = false;
const reanimatedSupportError = () => {
  if (_renderHelpers.REANIMATED_VERSION_MAJOR !== null && _renderHelpers.REANIMATED_VERSION_MAJOR >= 4) {
    return "React Native Skia requires react-native-worklets >= 0.7.0 for its " + "Reanimated integration on native platforms. Reanimated 4 is " + "installed, but react-native-worklets is missing or too old. " + "Please install or upgrade react-native-worklets.";
  }
  return "React Native Skia requires Reanimated 4 (react-native-worklets >= " + "0.7.0) for its Reanimated integration on native platforms. " + "Reanimated 3 is not supported anymore: Skia objects cannot be used " + "inside worklets or shared values with it. " + "Please upgrade to react-native-reanimated >= 4.0.0.";
};
const createContainer = (Skia, nativeId) => {
  if (_renderHelpers.HAS_REANIMATED_4 && nativeId !== -1) {
    return new NativeReanimatedContainer(Skia, nativeId);
  } else {
    if (_renderHelpers.HAS_REANIMATED_3 && !_renderHelpers.HAS_REANIMATED_4) {
      const message = reanimatedSupportError();
      if (__DEV__) {
        // Fail loudly in development — a silent fallback to static rendering
        // would only be noticed as frozen animations.
        throw new Error(message);
      }
      if (!hasWarnedAboutReanimatedSupport) {
        hasWarnedAboutReanimatedSupport = true;
        console.error(`${message} Falling back to static rendering (animations will not run).`);
      }
    }
    return new _StaticContainer.StaticContainer(Skia, nativeId);
  }
};
exports.createContainer = createContainer;
//# sourceMappingURL=Container.native.js.map