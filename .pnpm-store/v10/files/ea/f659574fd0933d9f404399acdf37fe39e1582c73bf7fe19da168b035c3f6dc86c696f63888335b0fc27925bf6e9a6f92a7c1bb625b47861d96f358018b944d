import { FontSlant, FontWeight } from "../types";
import type { DataModule, DataSourceParam, SkFontMgr } from "../types";
import type { SkTypefaceFontProvider } from "../types/Paragraph/TypefaceFontProvider";
/**
 * Returns a Skia Font object
 * */
export declare const useFont: (font: DataSourceParam, size?: number, onError?: (err: Error) => void) => import("../types").SkFont | null;
/**
 * React Native style font slant, as found in the `fontStyle` property of
 * `TextStyle`. The Skia {@link FontSlant} enum is accepted as well.
 */
export type RNFontSlant = "normal" | "italic" | "oblique" | FontSlant;
/**
 * React Native style font weight, as found in the `fontWeight` property of
 * `TextStyle`. Numeric weights such as the {@link FontWeight} enum values
 * used by the Paragraph API are accepted as well.
 */
export type RNFontWeight = "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | FontWeight;
/**
 * Font style accepted by {@link matchFont}.
 * `fontStyle` and `fontWeight` accept both the React Native string values
 * and the Skia enums ({@link FontSlant} and {@link FontWeight}), so the same
 * values can be shared with the Paragraph API.
 */
export interface RNFontStyle {
    fontFamily: string;
    fontSize: number;
    fontStyle: RNFontSlant;
    fontWeight: RNFontWeight;
}
export declare const matchFont: (inputStyle?: Partial<RNFontStyle>, fontMgr?: SkFontMgr) => import("../types").SkFont;
export declare const listFontFamilies: (fontMgr?: SkFontMgr) => string[];
export declare const useFonts: (sources: Record<string, DataModule[]>) => SkTypefaceFontProvider | null;
