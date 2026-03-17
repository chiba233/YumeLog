<template>
  <div class="dashboardTitle">
    <n-avatar
      :src="icon"
      :alt="personRawData?.author[lang] ?? personRawData?.author?.en"
      :img-props="{
        alt: personRawData?.author[lang] ?? personRawData?.author?.en,
      }"
      bordered
      class="titleIcon"
      round
    ></n-avatar>
    <h2 :lang="lang" class="titleText">
      {{ displayTitle }}
    </h2>
  </div>
</template>

<script lang="ts" setup>
import { NAvatar } from "naive-ui";
import icon from "../icons/icon.webp";
import { useYamlText } from "@/components/ts/useYamlI18n.ts";
import { useHead } from "@unhead/vue";
import { lang } from "@/components/ts/setupLang.ts";
import { personRawData } from "@/components/ts/setupJson.ts";

const displayTitle = useYamlText("main", "title.yaml", "title");
const siteOrigin = import.meta.env.SSR ? import.meta.env.VITE_SSR_SITE_URL : window.location.origin;
useHead(() => ({
  meta: [
    {
      property: "og:title",
      content: displayTitle.value.slice(0, 160),
    },
    {
      property: "og:image",
      content: `${siteOrigin}/icon/icon.webp`,
    },
  ],
}));
</script>

<style lang="scss">
.dashboardTitle {
  display: flex;
  margin-bottom: 0.5em;
  margin-top: 4rem;
  @media (min-width: 840px) {
    flex-direction: row;
    justify-content: center;
  }
  @media (max-width: 840px) {
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  @media (max-width: 430px) {
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  .titleText {
    display: flex;
    flex-wrap: wrap;
    align-content: center;
    color: var(--direct-font-color);
    font-weight: 500;
    text-shadow: var(--direct-font-shadow);
    margin: 0;
    text-align: center;
    @media (min-width: 840px) {
      font-size: 2em;
      margin-left: 1.5em;
    }
    @media (max-width: 840px) {
      padding-top: 0.5em;
      font-size: 1.8em;
    }
  }

  .titleIcon {
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    @media (min-width: 380px) {
      display: flex;
      width: 6em;
      height: 6em;
      flex-shrink: 0;
    }
    @media (max-width: 380px) {
      display: flex;
      width: 4em;
      height: 4em;
      flex-shrink: 0;
    }
  }
}
</style>
