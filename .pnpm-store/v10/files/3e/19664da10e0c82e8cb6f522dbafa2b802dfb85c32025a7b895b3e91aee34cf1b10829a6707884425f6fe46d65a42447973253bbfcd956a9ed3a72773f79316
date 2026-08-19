import React, { useMemo } from "react";
import { isRNModule, unwrapModule } from "../skia/types";
// Layout is observed by the views themselves (see SkiaPictureView.web.tsx):
// this shim only reproduces react-native-web's default View styling.
const View = ({
  children,
  style: rawStyle
}) => {
  const style = useMemo(() => rawStyle !== null && rawStyle !== void 0 ? rawStyle : {}, [rawStyle]);
  const cssStyles = useMemo(() => {
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
  return /*#__PURE__*/React.createElement("div", {
    style: cssStyles
  }, children);
};
export const Platform = {
  OS: "web",
  PixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : 1,
  // window is not defined on node
  resolveAsset: source => {
    const asset = unwrapModule(source);
    if (typeof asset === "string") {
      return asset;
    }
    if (isRNModule(asset)) {
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