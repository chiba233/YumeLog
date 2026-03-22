interface ImportMetaEnv {
  readonly VITE_SSR_SITE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
