<template>
  <div class="root">
    <div class="title">
      <h1 :lang="lang">{{ titleI18N[lang] || titleI18N.en }}</h1>
    </div>

    <blog-card></blog-card>
  </div>
</template>

<script lang="ts" setup>
import { lang } from "@/components/ts/setupLang.ts";
import BlogCard from "@/components/blogCard.vue";
import commonI18n from "@/data/I18N/commonI18n.json";

const titleI18N = commonI18n.blogWelcome as Record<string, string>;
</script>
<style lang="scss" scoped>
.root {
  width: 100%;

  .title {
    margin-top: 5em;
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;

    h1 {
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
      @media (min-width: 840px) {
        font-size: 2em;
      }
      @media (max-width: 840px) {
        font-size: 1.8em;
      }
    }
  }
}
</style>
