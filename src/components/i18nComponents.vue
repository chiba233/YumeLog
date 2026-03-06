<template>
  <n-popselect v-model:value="lang" :options="i18nLang" trigger="click">
    <n-button :color="themeColor" class="buttonI18" round>
      <template #icon>
        <n-icon size="20">
          <LangIcon />
        </n-icon>
      </template>
      <a> {{ i18nLang.find((it) => it.value === lang)?.label }}</a>
    </n-button>
  </n-popselect>
</template>

<script lang="ts" setup>
import LangIcon from "../icons/langIcon.svg";
import { NButton, NIcon, NPopselect, type SelectOption } from "naive-ui";
import { lang, themeColor } from "@/components/ts/useStoage";
import { watchEffect } from "vue";

type WebTitleMap = Record<string, string>

const [i18nLang, newWebTitle] = await Promise.all([
  fetch("/data/config/i18nLang.json").then(
    (res) => res.json() as Promise<SelectOption[]>,
  ),
  fetch("/data/main/webTitle.json").then(
    (res) => res.json() as Promise<WebTitleMap>,
  ),
]);

watchEffect(() => {
  document.documentElement.lang = lang.value;
  document.title = newWebTitle[lang.value] || "Strawberry Pages";
})
</script>

<style lang="scss">
.buttonI18 {
  margin-right: 1em;
  height: 2.2em;
  border: 1px solid rgba(255, 255, 255, 0.2);
  pointer-events: auto;
  @media (max-width: 300px) {
    .n-icon {
      margin-left: 6px;
    }
  }

  a {
    color: #191919;
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);
    @media (max-width: 300px) {
      display: none;
    }
  }
}
</style>
