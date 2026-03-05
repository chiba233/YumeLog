<template>
  <div class="root">
    <div class="title">
      <a>{{ titleI18N[lang] }}</a>
    </div>
    <blog-card></blog-card>
  </div>
</template>

<script lang="ts" setup>
import { lang } from "@/components/ts/useStoage";
import BlogCard from "@/components/blogCard.vue";

const titleI18N: Record<string, string> = {
  zh: "欢迎来到我的博客！",
  ja: "ブログをようこそ！",
  en: "Welcome Back to my blog!",
  other: "Welcome Back to my blog!",
};
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
