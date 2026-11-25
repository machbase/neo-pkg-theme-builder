// Types for theme-sync, the theme contract v1 (contract/theme-v1.md).
// Copy this file into a TypeScript app's sources; it describes what the script puts on `window`.
//
//   <script src="/public/neo-pkg-theme-builder/cgi-bin/theme/v1/sync"></script>

export type NeoThemeScheme = 'light' | 'dark';

export interface NeoThemeChangeDetail {
    scheme: NeoThemeScheme;
    /** Every token's value, by name without the prefix (`side-bg` is `--neo-side-bg`). */
    vars: Record<string, string>;
}

export interface NeoThemeSync {
    /** The contract's major version: 1. */
    contract: 1;
    /** What v1 has grown since (1 when it started). */
    revision: number;
    /** Reads the theme again and puts it on now. */
    refresh(): void;
    /** Called after each change is put on; returns the function that stops it. */
    onChange(listener: (detail: NeoThemeChangeDetail) => void): () => void;
}

declare global {
    interface Window {
        neoThemeSync?: NeoThemeSync;
    }
    interface WindowEventMap {
        'neo-theme-change': CustomEvent<NeoThemeChangeDetail>;
    }
}
