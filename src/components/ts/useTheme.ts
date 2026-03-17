import { computed, watchEffect } from "vue";
import { useStorage } from "@vueuse/core";

const parseHex = (hex: string): [number, number, number] => {
  let cleanHex = hex.replace("#", "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(cleanHex, 16) || 0;
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
};

const clamp = (v: number) => Math.min(Math.max(v, 0), 255);

export const themeColor = useStorage("setColor", "#000000");

export const themeMetrics = computed(() => {
  const [r, g, b] = parseHex(themeColor.value);
  const deepOffset = 90;
  const glassTarget = [251, 238, 241];
  const glassRatio = 0.08;

  const dr = clamp(r - deepOffset);
  const dg = clamp(g - deepOffset);
  const db = clamp(b - deepOffset);
  const deepRgbStr = `${dr}, ${dg}, ${db}`;

  const luma = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

  const mR = Math.round(r * glassRatio + glassTarget[0] * (1 - glassRatio));
  const mG = Math.round(g * glassRatio + glassTarget[1] * (1 - glassRatio));
  const mB = Math.round(b * glassRatio + glassTarget[2] * (1 - glassRatio));

  const fR = clamp(Math.round(234 * 0.95 + r * 0.05));
  const fG = clamp(Math.round(234 * 0.95 + g * 0.05));
  const fB = clamp(Math.round(234 * 0.95 + b * 0.05));

  return {
    rgbStr: `${r}, ${g}, ${b}`,
    deepRgbStr: deepRgbStr,
    colorDeep: `rgb(${deepRgbStr})`,
    glassColor: `rgba(${mR}, ${mG}, ${mB}, 0.4)`,
    glassFont: `rgba(${Math.round(mR * 0.12)}, ${Math.round(mG * 0.12)}, ${Math.round(mB * 0.12)}, 0.92)`,
    glassShadow:
      luma > 0.5 ? `0 1px 3px rgba(${deepRgbStr}, 0.08)` : `0 1px 4px rgba(0, 0, 0, 0.18)`,
    directFont: `rgba(${fR}, ${fG}, ${fB}, 0.98)`,
    luma,
  };
});

export const globalColorDeep = computed(() => themeMetrics.value.colorDeep);
export const globalRgbDeep = computed(() => themeMetrics.value.deepRgbStr);
export const globalGlassColor = computed(() => themeMetrics.value.glassColor);
export const globalGlassFont = computed(() => themeMetrics.value.glassFont);
export const globalDirectFont = computed(() => themeMetrics.value.directFont);

export const useTheme = () => {
  if (import.meta.env.SSR) return;

  const root = document.documentElement;

  watchEffect(() => {
    const m = themeMetrics.value;

    root.style.setProperty("--global-theme-color", themeColor.value);
    root.style.setProperty("--global-theme-color-rgb", m.rgbStr);
    root.style.setProperty("--global-theme-rgb-deep", m.deepRgbStr);
    root.style.setProperty("--global-theme-color-deep", m.colorDeep);
    root.style.setProperty("--global-theme-glass", m.glassColor);
    root.style.setProperty("--glass-font-color", m.glassFont);
    root.style.setProperty("--glass-text-shadow", m.glassShadow);
    root.style.setProperty("--direct-font-color", m.directFont);

    const strokeOpacity = 0.7;
    const directShadow = `0.5px 0 0 rgba(0,0,0,${strokeOpacity}),
     -0.5px 0 0 rgba(0,0,0,${strokeOpacity}),
      0 0.5px 0 rgba(0,0,0,${strokeOpacity}),
       0 -0.5px 0 rgba(0,0,0,${strokeOpacity}),
        0 2px 4px rgba(${m.deepRgbStr}, 0.25)`;
    root.style.setProperty("--direct-font-shadow", directShadow);
  });
};
