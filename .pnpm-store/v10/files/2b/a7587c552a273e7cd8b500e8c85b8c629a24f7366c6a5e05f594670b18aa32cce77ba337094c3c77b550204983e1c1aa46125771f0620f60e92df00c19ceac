import { useCallback, useEffect, useState } from "react";
import { Skia } from "../../skia";
import Rea from "./ReanimatedProxy";

// Created lazily: accessing the proxy at module scope would require
// react-native-reanimated as soon as the package is imported, and would spawn
// the runtime even for apps that never load a video.
let runtime;
const getRuntime = () => {
  if (runtime === undefined) {
    runtime = Rea.createWorkletRuntime("video-metadata-runtime");
  }
  return runtime;
};
export const useVideoLoading = source => {
  const {
    runOnJS
  } = Rea;
  const [video, setVideo] = useState(null);
  const cb = useCallback(src => {
    "worklet";

    const vid = Skia.Video(src);
    runOnJS(setVideo)(vid);
  }, [runOnJS]);
  useEffect(() => {
    if (source) {
      Rea.runOnRuntime(getRuntime(), cb)(source);
    }
  }, [cb, source]);
  return video;
};
//# sourceMappingURL=useVideoLoading.js.map