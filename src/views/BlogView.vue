<template>
  <div class="root">
    <div class="title">
      <a>{{ titleI18N[lang] || titleI18N.en }}</a>
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

    a {
      display: flex;
      flex-wrap: wrap;
      align-content: center;
      color: #eaeaea;
      text-shadow:
        0.5px 0 0 rgba(0, 0, 0, 0.7),
        -0.5px 0 0 rgba(0, 0, 0, 0.7),
        0 0.5px 0 rgba(0, 0, 0, 0.7),
        0 -0.5px 0 rgba(0, 0, 0, 0.7);
      font-weight: 350;
      @media (min-width: 730px) {
        font-size: 2.5em;
      }
      @media (max-width: 730px) {
        font-size: 2em;
      }
    }
  }
}
</style>
