export const __esModule: boolean;
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
export function createFrameScope(Skia: any): {
    Skia: any;
    track: (value: any) => any;
    dispose: () => void;
};
