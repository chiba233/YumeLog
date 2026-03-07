<template>
  <div class="root">
    <div class="title">
      <a>{{ titleI18N[lang] || titleI18N.en }}</a>
    </div>
    <blog-card></blog-card>
  </div>
</template>

<script lang="ts" setup>
import { lang } from "@/components/ts/useStorage.ts";
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
      color: white;
      text-shadow: #383838 1px 0 0,
      #383838 0 1px 0,
      #383838 -1px 0 0,
      #383838 0 -1px 0;
      font-weight: lighter;
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
