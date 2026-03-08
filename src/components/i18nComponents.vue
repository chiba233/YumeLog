<template>
  <n-popselect v-model:value="lang" :options="i18nLang" trigger="click">
    <n-button :color="themeColor" :style="{ '--dynamic-width': props.btnWidth }" class="buttonI18 sync-btn" round>
      <template #icon>
        <n-icon size="20">
          <LangIcon />
        </n-icon>
      </template>
      <a v-if="i18nLang.length > 0"> {{ i18nLang.find((it) => it.value === lang)?.label }}</a>
    </n-button>
  </n-popselect>
</template>

<script lang="ts" setup>
import LangIcon from "../icons/langIcon.svg";
import { NButton, NIcon, NPopselect, type SelectOption } from "naive-ui";
import { lang, themeColor } from "@/components/ts/useStorage.ts";
import { onMounted, shallowRef, watchEffect } from "vue";

interface Props {
  btnWidth?: string;
}

const props = withDefaults(defineProps<Props>(), {
  btnWidth: "auto",
});
const i18nLang = shallowRef<SelectOption[]>([]);

onMounted(async () => {
  await fetch("/data/config/i18nLang.json")
    .then(res => res.json())
    .then((langData: SelectOption[]) => {
      i18nLang.value = langData;
    });
});


watchEffect(() => {
  document.documentElement.lang = lang.value;
});
</script>

<style lang="scss">
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
      margin-left: 6px !important
    }
  }

  a {
    color: #191919;
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);
    white-space: nowrap;
    @media (max-width: 300px) {
      display: none;
    }
  }
}
</style>
