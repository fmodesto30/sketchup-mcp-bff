/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BFF_URL?: string;
  readonly VITE_MOCKS?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
