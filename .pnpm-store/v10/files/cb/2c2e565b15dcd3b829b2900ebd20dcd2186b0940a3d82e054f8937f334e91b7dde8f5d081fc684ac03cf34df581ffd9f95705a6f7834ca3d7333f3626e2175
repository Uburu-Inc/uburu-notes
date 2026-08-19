import { Image, PixelRatio, Platform as RNPlatform, findNodeHandle, View } from "react-native";
import { isRNModule, unwrapModule } from "../skia/types";
export const Platform = {
  OS: RNPlatform.OS,
  PixelRatio: PixelRatio.get(),
  resolveAsset: source => {
    const asset = unwrapModule(source);
    if (typeof asset === "string") {
      return asset;
    }
    return isRNModule(asset) ? Image.resolveAssetSource(asset).uri : asset.uri;
  },
  findNodeHandle,
  View
};
//# sourceMappingURL=Platform.js.map