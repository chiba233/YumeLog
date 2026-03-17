<template>
  <div class="root">
    <div class="title">
      <h1 v-if="ssrHideTitle" :lang="lang">{{ titleI18N[lang] || titleI18N.en }}</h1>
    </div>

    <blog-card></blog-card>
  </div>
</template>

<script lang="ts" setup>
import { lang } from "@/components/ts/setupLang.ts";
import BlogCard from "@/components/blogCard.vue";
import commonI18n from "@/data/I18N/commonI18n.json";
import {
  blogDisplay,
  currentPostTitle,
  globalWebTitleMap,
  posts,
  selectedPost,
  showModal,
  WebTitleMap,
} from "@/components/ts/useGlobalState.ts";
import { computed, onMounted, onServerPrefetch, watch } from "vue";
import { useRoute } from "vue-router";
import { useContentStore } from "@/components/ts/contentStore.ts";
import { Post } from "@/components/ts/d";
import router from "@/router";
import { listPrimaryError, listSpareError, yamlLoadingFault } from "@/components/ts/getYaml.ts";
import { $message } from "@/components/ts/msgUtils.ts";
import { blogUseHead, isSSR } from "@/components/ts/useHead.ts";

const titleI18N = commonI18n.blogWelcome as Record<string, string>;
const ssrHideTitle = computed(() => !(isSSR && selectedPost.value));
const route = useRoute();
const { getPosts, getSingle } = useContentStore();

if (import.meta.env.SSR) {
  onServerPrefetch(async () => {
    const currentId = route.params.id as string;
    try {
      const [postsData, titleData] = await Promise.all([
        getPosts<Post>("blog"),
        getSingle<WebTitleMap>("main", "webTitle.json"),
      ]);
      if (titleData) globalWebTitleMap.value = titleData;

      if (postsData?.length) {
        const targetPost = currentId
          ? postsData.find(
              (p) =>
                p.id === currentId ||
                p.title
                  ?.trim()
                  .replace(/[\/\\?#]/g, "")
                  .replace(/\s+/g, "-") === currentId,
            )
          : null;
        posts.value = postsData;
        if (targetPost) {
          selectedPost.value = targetPost;
          showModal.value = true;
          currentPostTitle.value = targetPost.title ?? null;
        } else {
          selectedPost.value = null;
          showModal.value = false;
        }
      }
    } catch (err) {
      console.error("SSR Prefetch Error:", err);
    }
  });
}
onMounted(async () => {
  const [postsData, titleData] = await Promise.all([
    getPosts<Post>("blog"),
    getSingle<WebTitleMap>("main", "webTitle.json"),
  ]);

  posts.value = postsData;
  if (titleData) {
    globalWebTitleMap.value = titleData;
  }
  if (Object.keys(route.query).length > 0) {
    await router.replace({
      path: route.path,
      query: {},
    });
  }
});
blogUseHead();
watch(
  () => yamlLoadingFault.value,
  (v) => v && $message.warning(blogDisplay.value.partialLoadError, true, 3000),
);

watch(
  () => listPrimaryError.value,
  (v) => v && $message.warning(blogDisplay.value.listPrimaryError, true, 3000),
);

watch(
  () => listSpareError.value,
  (v) => v && $message.warning(blogDisplay.value.listSpareError, true, 3000),
);
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
      color: var(--direct-font-color);
      text-shadow: var(--direct-font-shadow);
      font-weight: 500;
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
