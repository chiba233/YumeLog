<template>
  <n-popselect
    v-model:value="lang"
    :menu-props="{
      class: 'custom-i18n-menu',
      style: { '--dynamic-theme-color': themeColor },
    }"
    :options="i18nLang"
    trigger="click"
  >
    <n-button
      :color="themeColor"
      :style="{ '--dynamic-width': props.btnWidth }"
      class="buttonI18 sync-btn"
      round
    >
      <template #icon>
        <n-icon size="20">
          <LangIcon />
        </n-icon>
      </template>
      <a v-if="i18nLang.length > 0" :lang="lang" class="commonText">
        {{ i18nLang.find((it) => it.value === lang)?.label }}</a
      >
    </n-button>
  </n-popselect>
</template>

<script lang="ts" setup>
import { onMounted, shallowRef, watchEffect } from "vue";
import { lang } from "@/components/ts/setupLang.ts";
import { themeColor, useTheme } from "@/components/ts/useTheme.ts";
import { NButton, NIcon, NPopselect, type SelectOption } from "naive-ui";
import LangIcon from "../icons/langIcon.svg";

useTheme(90);
interface Props {
  btnWidth?: string;
}

const props = withDefaults(defineProps<Props>(), {
  btnWidth: "auto",
});
const i18nLang = shallowRef<SelectOption[]>([]);

onMounted(async () => {
  await fetch("/data/config/i18nLang.json")
    .then((res) => res.json())
    .then((langData: SelectOption[]) => {
      i18nLang.value = langData;
    });
});

watchEffect(() => {
  if (import.meta.env.SSR) return;
  document.documentElement.lang = lang.value;
});
</script>

<style lang="scss">
.v-binder-follower-content {
  border-radius: 12px !important;
  overflow: hidden !important;

  &[class*="-transition-"] {
    border-radius: 12px !important;
  }

  .n-popselect-menu.n-base-select-menu {
    --n-color: rgba(251, 238, 241, 0.6) !important;
    background-color: var(--n-color) !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
    border-radius: 12px !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
    border: 1px solid rgba(255, 255, 255, 0.4) !important;

    --n-option-text-color-active: var(--global-theme-color-deep) !important;
    --n-option-check-color: var(--global-theme-color-deep) !important;

    .n-base-select-option {
      border-radius: 12px !important;
      margin: 4px 6px !important;
      position: relative;
      padding: 8px 12px !important;
      transition: background-color 0.2s ease !important;
      color: #191919;

      &::before {
        border-radius: 12px !important;
        left: 0 !important;
        right: 0 !important;
      }

      .n-base-select-option__content {
        flex: 1;
        display: flex;
        align-items: center;
        font-size: 1.15em;
        padding-right: 28px !important;
        text-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);
        transition:
          color 0.2s,
          text-shadow 0.2s;
        box-sizing: border-box;
      }

      .n-base-select-option__check,
      .n-base-select-option__icon {
        position: absolute !important;
        right: 12px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        z-index: 2 !important;

        display: flex !important;
        width: 1.15em;
        height: 1.15em;
        text-shadow: none !important;
        -webkit-text-stroke: 0 !important;

        svg {
          stroke-width: 1px;
          stroke: var(--global-theme-color-deep);
          fill: var(--global-theme-color-deep);
          width: 100%;
          height: 100%;
        }
      }

      &.n-base-select-option--selected,
      &.n-base-select-option--pending {
        background-color: rgba(var(--global-theme-rgb-deep), 0.1) !important;
      }

      &.n-base-select-option--selected {
        .n-base-select-option__content {
          color: var(--global-theme-color-deep) !important;
          font-weight: bold !important;
          -webkit-text-stroke: 0.5px var(--global-theme-color-deep);
          paint-order: stroke fill;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      }
    }

    .n-base-select-menu-option-wrapper {
      background-color: transparent !important;
      padding: 4px 0 !important;
    }
  }
}

.buttonI18 {
  margin-right: 1em;
  height: 2.2em;
  border: 1px solid rgba(255, 255, 255, 0.2);
  pointer-events: auto;
  min-width: var(--dynamic-width, auto);
  width: auto;

  @media (min-width: 301px) {
    min-width: var(--dynamic-width, auto);
  }

  @media (max-width: 300px) {
    min-width: 5em !important;
    width: 5em !important;
    padding: 0 !important;
    .n-icon {
      margin-left: 6px !important;
    }
  }

  a {
    white-space: nowrap;
    @media (max-width: 300px) {
      display: none;
    }
  }
}
</style>
