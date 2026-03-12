interface ImportMetaEnv {
  readonly VITE_SITE_URL: string;
  readonly VITE_SSR_SITE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
