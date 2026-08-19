import type { FC, RefObject } from "react";
import React from "react";
import type { MeasureInWindowOnSuccessCallback, MeasureOnSuccessCallback, ViewProps } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import type { SkImage, SkRect, SkSize } from "../skia/types";
export interface CanvasRef extends FC<CanvasProps> {
    makeImageSnapshot(rect?: SkRect): SkImage;
    makeImageSnapshotAsync(rect?: SkRect): Promise<SkImage>;
    redraw(): void;
    getNativeId(): number;
    measure(callback: MeasureOnSuccessCallback): void;
    measureInWindow(callback: MeasureInWindowOnSuccessCallback): void;
}
export declare const useCanvasRef: () => RefObject<CanvasRef | null>;
export declare const useCanvasSize: (userRef?: RefObject<CanvasRef | null>) => {
    ref: RefObject<CanvasRef | null>;
    size: SkSize;
};
export declare const isFabric: boolean;
export interface CanvasProps extends Omit<ViewProps, "onLayout"> {
    debug?: boolean;
    /** @deprecated Not supported on Fabric. Use `onSize` or `useCanvasSize()` instead. */
    onLayout?: ViewProps["onLayout"];
    opaque?: boolean;
    onSize?: SharedValue<SkSize>;
    colorSpace?: "p3" | "srgb";
    /**
     * Renders into a surface with more than 8 bits per channel (16-bit float on
     * iOS, 10-bit on Android) to avoid banding in subtle gradients. Colors are
     * identical to the default 8-bit surface, only with more precision (this is
     * about bit depth, not HDR). On Android the extra precision survives
     * composition only when combined with `opaque`, and the prop must be set
     * before the canvas is mounted.
     */
    highBitDepth?: boolean;
    ref?: React.Ref<CanvasRef>;
    androidWarmup?: boolean;
    __destroyWebGLContextAfterRender?: boolean;
}
export declare const Canvas: ({ debug, opaque, children, onSize, colorSpace, highBitDepth, androidWarmup, ref, onLayout, ...viewProps }: CanvasProps) => React.JSX.Element;
