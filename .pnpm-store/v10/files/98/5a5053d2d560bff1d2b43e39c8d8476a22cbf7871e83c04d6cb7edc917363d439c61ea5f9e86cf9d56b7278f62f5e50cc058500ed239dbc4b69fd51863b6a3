"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Platform = void 0;
var _react = _interopRequireWildcard(require("react"));
var _types = require("../skia/types");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
// Layout is observed by the views themselves (see SkiaPictureView.web.tsx):
// this shim only reproduces react-native-web's default View styling.
const View = ({
  children,
  style: rawStyle
}) => {
  const style = (0, _react.useMemo)(() => rawStyle !== null && rawStyle !== void 0 ? rawStyle : {}, [rawStyle]);
  const cssStyles = (0, _react.useMemo)(() => {
    return {
      alignItems: "stretch",
      backgroundColor: "transparent",
      border: "0 solid black",
      boxSizing: "border-box",
      display: "flex",
      flexBasis: "auto",
      flexDirection: "column",
      flexShrink: 0,
      listStyle: "none",
      margin: 0,
      minHeight: 0,
      minWidth: 0,
      padding: 0,
      position: "relative",
      textDecoration: "none",
      zIndex: 0,
      ...style
    };
  }, [style]);
  return /*#__PURE__*/_react.default.createElement("div", {
    style: cssStyles
  }, children);
};
const Platform = exports.Platform = {
  OS: "web",
  PixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : 1,
  // window is not defined on node
  resolveAsset: source => {
    const asset = (0, _types.unwrapModule)(source);
    if (typeof asset === "string") {
      return asset;
    }
    if ((0, _types.isRNModule)(asset)) {
      if (typeof require === "function") {
        const {
          getAssetByID
        } = require("react-native/Libraries/Image/AssetRegistry");
        const {
          httpServerLocation,
          name,
          type
        } = getAssetByID(asset);
        const uri = `${httpServerLocation}/${name}.${type}`;
        return uri;
      }
      throw new Error("Asset source is a number - this is not supported on the web");
    }
    return asset.uri;
  },
  findNodeHandle: () => {
    throw new Error("findNodeHandle is not supported on the web");
  },
  View
};
//# sourceMappingURL=Platform.web.js.map