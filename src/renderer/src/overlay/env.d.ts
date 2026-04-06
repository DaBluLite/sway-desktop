/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  readonly RENDERER_VITE_GOOGLE_MAPS_KEY: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
