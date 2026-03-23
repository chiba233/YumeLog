const LOCAL_ORIGIN_PATTERN =
  /^https?:\/\/(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[::1\])(?::\d+)?$/i;
const HTTP_ASSET_PATTERN = /^https?:\/\//i;
const ROOT_RELATIVE_ASSET_PATTERN = /^\/(?!\/)/;

export const normalizeSiteOrigin = (origin?: string | null): string => {
  return (origin ?? "").trim().replace(/\/+$/, "");
};

export const isSafeStaticOrigin = (origin?: string | null): boolean => {
  const normalized = normalizeSiteOrigin(origin);
  return Boolean(normalized) && !LOCAL_ORIGIN_PATTERN.test(normalized);
};

export interface ResolveSiteOriginOptions {
  ssr: boolean;
  ssrOrigin?: string | null;
  browserOrigin?: string | null;
}

export const resolveSiteOrigin = ({
  ssr,
  ssrOrigin,
  browserOrigin,
}: ResolveSiteOriginOptions): string => {
  if (ssr) {
    return isSafeStaticOrigin(ssrOrigin) ? normalizeSiteOrigin(ssrOrigin) : "";
  }

  return normalizeSiteOrigin(browserOrigin);
};

export const toAbsoluteSiteUrl = (origin: string, resourcePath: string): string => {
  const normalizedOrigin = normalizeSiteOrigin(origin);
  if (!normalizedOrigin) return "";
  const normalizedPath = resourcePath.startsWith("/") ? resourcePath : `/${resourcePath}`;
  return `${normalizedOrigin}${normalizedPath}`;
};

export const isUnsafeLocalAssetPath = (value?: string | null): boolean => {
  const normalized = (value ?? "").trim();
  if (!normalized) return false;

  return !HTTP_ASSET_PATTERN.test(normalized) && !ROOT_RELATIVE_ASSET_PATTERN.test(normalized);
};

export const sanitizeAssetUrl = (value?: string | null): string => {
  const normalized = (value ?? "").trim();
  if (!normalized) return "";
  return isUnsafeLocalAssetPath(normalized) ? "" : normalized;
};
