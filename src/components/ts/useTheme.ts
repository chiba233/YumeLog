import { watchEffect } from "vue";
import { useCssVar, useStorage } from "@vueuse/core";

const toRGB = (hex: string, offset = 0) => {
  const num = parseInt(hex.replace("#", ""), 16) || 0;
  const clamp = (v: number) => Math.min(Math.max(v, 0), 255);
  return `${clamp((num >> 16) - offset)}, ${clamp(((num >> 8) & 0xff) - offset)}, ${clamp((num & 0xff) - offset)}`;
};

export const themeColor = useStorage("setColor", "#000000");

export const useTheme = (deepOffset = 90) => {
  if (import.meta.env.SSR) return;

  const root = document.documentElement;

  const color = useCssVar("--global-theme-color", root);
  const rgbDeep = useCssVar("--global-theme-rgb-deep", root);
  const colorDeep = useCssVar("--global-theme-color-deep", root);

  watchEffect(() => {
    const rgb = toRGB(themeColor.value, deepOffset);

    color.value = themeColor.value;
    rgbDeep.value = rgb;
    colorDeep.value = `rgb(${rgb})`;
  });
};
