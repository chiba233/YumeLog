<template>
  <div class="dashboardTitle">
    <ClientOnly>
      <n-avatar :src="icon" bordered class="titleIcon" round></n-avatar>
    </ClientOnly>
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
import ClientOnly from "@/components/ClientOnly.vue";

const iconUrl = new URL("../icons/icon.webp", import.meta.url).href;

const displayTitle = useYamlText("main", "title.yaml", "title");

if (!import.meta.env.SSR) {
  useHead({
    meta: [
      {
        property: "og:image",
        content: iconUrl,
      },
    ],
  });
}
useHead(() => ({
  meta: [
    {
      property: "og:title",
      content: displayTitle.value.slice(0, 160),
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
    color: #eaeaea;
    text-shadow:
      0.5px 0 0 rgba(0, 0, 0, 0.7),
      -0.5px 0 0 rgba(0, 0, 0, 0.7),
      0 0.5px 0 rgba(0, 0, 0, 0.7),
      0 -0.5px 0 rgba(0, 0, 0, 0.7);
    font-weight: normal;
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
