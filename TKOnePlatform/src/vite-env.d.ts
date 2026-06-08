/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When "true", the app runs the deterministic built-in engine with no
   *  backend call — used for the shareable static (GitHub Pages) demo. */
  readonly VITE_STATIC_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
