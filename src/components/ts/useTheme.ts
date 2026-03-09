import { watchEffect } from "vue";
import { useCssVar, useStorage } from "@vueuse/core";

const toRGB = (hex: string, offset = 0) => {
  const num = parseInt(hex.replace("#", ""), 16) || 0;
  const clamp = (val: number) => Math.min(Math.max(val, 0), 255);
  return `${clamp((num >> 16) - offset)}, ${clamp(((num >> 8) & 0xff) - offset)}, ${clamp((num & 0xff) - offset)}`;
};

export const themeColor = useStorage("setColor", "#000000");

export const useTheme = (deepOffset = 90) => {
  const root = document.documentElement;
  const vars = {
    color: useCssVar("--global-theme-color", root),
    rgbDeep: useCssVar("--global-theme-rgb-deep", root),
    colorDeep: useCssVar("--global-theme-color-deep", root),
  };

  watchEffect(() => {
    const rgb = toRGB(themeColor.value, deepOffset);
    vars.color.value = themeColor.value;
    vars.rgbDeep.value = rgb;
    vars.colorDeep.value = `rgb(${rgb})`;
  });
};
