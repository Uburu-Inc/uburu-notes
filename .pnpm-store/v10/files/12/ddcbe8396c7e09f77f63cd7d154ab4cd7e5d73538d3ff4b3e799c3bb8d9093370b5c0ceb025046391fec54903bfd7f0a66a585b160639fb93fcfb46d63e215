import type { SkJSIInstance } from "../JsiInstance";
export type SkData = SkJSIInstance<"Data">;
type RNModule = number;
type MetroAsset = {
    uri: string;
    width: number;
    height: number;
};
type ESModule = {
    __esModule: true;
    default: RNModule | MetroAsset | string;
};
export type DataModule = RNModule | ESModule | MetroAsset;
export type DataSource = DataModule | string | Uint8Array;
export type DataSourceParam = DataSource | null | undefined;
export declare const isRNModule: (mod: DataModule) => mod is RNModule;
export declare const unwrapModule: (mod: DataModule) => RNModule | MetroAsset | string;
export {};
