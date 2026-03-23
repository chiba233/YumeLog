interface ImportMetaEnv {
  readonly VITE_SSR_SITE_URL: string;
  readonly VITE_SSR_LANG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
