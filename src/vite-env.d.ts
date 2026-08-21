/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_ACTIONGUARD_API_URL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
