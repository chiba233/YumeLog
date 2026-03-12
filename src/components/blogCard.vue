<script lang="ts" setup>
import {
  Component,
  computed,
  defineAsyncComponent,
  onMounted,
  onServerPrefetch,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { useHead } from "@unhead/vue";

import {
  changeSpareUrl,
  faultTimes,
  listPrimaryError,
  listSpareError,
  loadError,
  Post,
  serverError,
  yamlLoading,
  yamlLoadingFault,
  yamlRetrying,
} from "@/components/ts/getYaml.ts";
import { formatDate, formatTime, lang } from "@/components/ts/setupLang.ts";
import Cancel from "@/icons/cancel.svg";
import { NAlert, NButton, NCard, NIcon, NImage, NModal } from "naive-ui";
import { parseRichText, stripRichText } from "@/components/ts/blogFormat.ts";
import { useCardGlow } from "@/components/ts/animationCalculate.ts";
import { $message } from "@/components/ts/msgUtils.ts";
import { PushPinSharp } from "@vicons/material";
import { useContentStore } from "./ts/contentStore";
import {
  blogDisplay,
  currentPostTitle,
  globalWebTitleMap,
} from "@/components/ts/useGlobalState.ts";
import { useRouteModal } from "@/components/ts/useRouteModal.ts";

const router = useRouter();
const { getPosts, getSingle } = useContentStore();

interface ImageContent {
  src: string;
  spareUrl?: string;
  desc?: string;
}

interface PostBlock {
  type: string;
  content?: string | ImageContent[];
}

type WebTitleMap = Record<string, Record<string, string>>;

interface ProcessedPost extends Post {
  displayDescription: string;
}

const posts = ref<Post[]>([]);
const selectedPost = ref<Post | null>(null);
const showModal = ref(false);

const RichTextRenderer: Component = defineAsyncComponent(
  () => import("@/components/RichTextRenderer.vue"),
);
const route = useRoute();
const isSSR = import.meta.env.SSR;
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
        const targetPost = currentId ? postsData.find((p) => p.id === currentId) : null;
        posts.value = postsData;
        if (targetPost) {
          selectedPost.value = targetPost;
          showModal.value = true;
          currentPostTitle.value = targetPost.title ?? null;
        }
      }
    } catch (err) {
      console.error("SSR Prefetch Error:", err);
    }
  });
}

const getImageBlocks = (blocks?: PostBlock[]) => {
  if (!blocks) return [];

  return blocks.filter((b) => b.type === "image");
};

const getDescriptionText = (blocks?: PostBlock[]) => {
  if (!blocks) return "";

  return blocks
    .filter((b) => b.type === "text" || b.type === "center")
    .map((b) => (typeof b.content === "string" ? stripRichText(b.content) : ""))
    .join(" ");
};

const handleImgError = (e: Event, spareUrl?: string) => {
  const target = e.target as HTMLImageElement;

  if (spareUrl) target.src = spareUrl;
};

const blogModals = computed(() => {
  const map: Record<string, typeof showModal> = {};

  posts.value.forEach((post) => {
    if (post.id) {
      map[post.id] = showModal;
    }
  });

  return map;
});

const blogHandlers = computed(() => {
  const handlers: Record<string, () => void> = {};

  posts.value.forEach((post) => {
    if (!post.id) return;

    handlers[post.id] = () => {
      selectedPost.value = post;
      currentPostTitle.value = post.title ?? null;
    };
  });

  return handlers;
});

const { openModal } = useRouteModal({
  baseRouteName: "blog",
  paramKey: "id",
  paramSource: "path",
  modals: blogModals,
  isReady: computed(() => posts.value.length > 0),
  loadHandlers: blogHandlers,
  onAllClosed: () => {
    currentPostTitle.value = null;
  },

  onInvalidId: async () => {
    $message.warning(blogDisplay.value.unknownPostId, true, 3000);

    await router.replace({
      name: "blog",
    });
  },
});

const processedPosts = computed<ProcessedPost[]>(() =>
  posts.value.map((post) => ({
    ...post,

    displayDescription: getDescriptionText(post.blocks as PostBlock[]),
  })),
);

const cardClick = (post: Post) => {
  if (!post.id) {
    $message.warning(blogDisplay.value.errorPostId, true, 3000);
    return;
  }

  void openModal(post.id);
};

const closePortal = async () => {
  await router.replace({ name: "blog" });
};

const baseTitle = computed(() => globalWebTitleMap.value?.blog?.[lang.value] ?? "Blog");
const siteOrigin = import.meta.env.SSR ? import.meta.env.VITE_SSR_SITE_URL : window.location.origin;
useHead({
  title: computed(() => {
    if (showModal.value && selectedPost.value?.title) {
      return `${selectedPost.value.title} - ${baseTitle.value}`;
    }

    return baseTitle.value;
  }),

  link: computed(() => {
    if (!showModal.value || !selectedPost.value?.id) {
      return [
        {
          rel: "canonical",
          href: `${siteOrigin}/blog`,
        },
      ];
    }

    return [
      {
        rel: "canonical",
        href: `${siteOrigin}/blog/${selectedPost.value.id}`,
      },
    ];
  }),
  script: computed(() => [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Blog",
        blogPost: posts.value.map((post) => ({
          "@type": "BlogPosting",
          headline: post.title,
          url: `${siteOrigin}/blog/${post.id}`,
          datePublished: post.time,
        })),
      }),
    },
  ]),
  meta: computed(() => {
    if (!showModal.value || !selectedPost.value) {
      return [
        {
          name: "description",
          content: baseTitle.value,
        },
        {
          property: "og:url",
          content: `${siteOrigin}/blog/`,
        },
        {
          property: "og:type",
          content: "website",
        },
      ];
    }

    const blocks = selectedPost.value.blocks as PostBlock[];

    const desc = getDescriptionText(blocks).slice(0, 160);

    const firstImg = (getImageBlocks(blocks)?.[0]?.content as ImageContent[])?.[0]?.src ?? "";

    return [
      {
        name: "description",
        content: desc,
      },

      {
        property: "og:description",
        content: desc,
      },

      {
        property: "og:image",
        content: firstImg,
      },

      {
        property: "og:title",
        content: selectedPost.value.title ?? "",
      },

      {
        name: "article:published_time",
        content: selectedPost.value.time ?? "",
      },

      {
        property: "og:type",
        content: "article",
      },
    ];
  }),
});

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

const { onMove, onLeave, onEnter } = useCardGlow();

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

<template>
  <div v-if="!(isSSR && selectedPost)" class="post-container">
    <article
      v-for="post in processedPosts"
      :key="post.time"
      class="post-card glass"
      @click="() => cardClick(post)"
      @mouseenter="onEnter"
      @mouseleave="onLeave"
      @mousemove="onMove"
    >
      <div class="content">
        <div class="post-header">
          <h2 :lang="post?.lang as string" class="post-title commonText">{{ post.title }}</h2>
          <div class="post-meta">
            <n-icon v-if="post.pin" size="15">
              <PushPinSharp />
            </n-icon>
            <span v-if="post.pin" class="time-divider">|</span>
            <time :datetime="post.time" :lang="lang">{{ formatDate(post.time!) }}</time>
            <span class="time-divider">|</span>
            <span :lang="lang">{{ formatTime(post.time) }}</span>
          </div>
        </div>

        <div class="post-body">
          <div v-if="getImageBlocks(post.blocks as PostBlock[]).length > 0" class="post-image">
            <template
              v-for="(block, idx) in getImageBlocks(post.blocks as PostBlock[]).slice(0, 2)"
              :key="idx"
            >
              <img
                v-if="Array.isArray(block.content) && block.content[0]?.src"
                :alt="block.content[0].desc"
                :class="{ secondImg: idx === 1 }"
                :src="block.content[0].src"
                loading="lazy"
                @error="(e) => handleImgError(e, (block.content as ImageContent[])?.[0]?.spareUrl)"
              />
            </template>
          </div>

          <div
            :class="{ 'expanded-text': !getImageBlocks(post.blocks as PostBlock[]).length }"
            class="post-description"
          >
            <p :lang="post?.lang as string" class="commonText">
              {{ post.displayDescription }}
            </p>
          </div>
        </div>
      </div>
    </article>
  </div>

  <div v-if="yamlLoading && processedPosts.length === 0" class="loading-state">
    <div class="loader">
      <n-alert v-if="serverError" :title="blogDisplay.listFetchError" class="alert" type="error">
        {{ blogDisplay.serverFault }}
      </n-alert>
      <n-alert v-else-if="loadError" :title="blogDisplay.notFoundError" class="alert" type="error">
        {{ blogDisplay.notFoundError }}
      </n-alert>
      <n-alert v-else-if="yamlRetrying" class="alert" title="Warning" type="warning">
        {{ blogDisplay.yamlRetrying }} {{ blogDisplay.retry }} {{ faultTimes }}
      </n-alert>
      <n-alert v-else-if="listSpareError" class="alert" title="Warning" type="warning">
        {{ blogDisplay.listSpareError }}
      </n-alert>
      <p v-else :lang="lang">{{ blogDisplay.loading }}</p>
    </div>
  </div>
  <div v-if="isSSR && selectedPost" aria-hidden="true" style="display: none">
    <article>
      <h2>{{ selectedPost.title }}</h2>
      <time>{{ selectedPost.time }}</time>
      <span>{{ formatTime(selectedPost.time) }}</span>
      <div v-for="(block, index) in selectedPost.blocks as PostBlock[]" :key="index">
        <div v-if="block.type === 'text'">
          <RichTextRenderer
            :lang="selectedPost?.lang as string"
            :tokens="parseRichText(block.content as string)"
          />
        </div>
        <div v-if="block.type === 'image'">
          <img
            v-for="img in block.content as ImageContent[]"
            :key="img.src"
            :alt="img.desc"
            :src="img.src"
          />
        </div>
      </div>
    </article>
  </div>
  <n-modal v-model:show="showModal" @mouseenter="onEnter" @mouseleave="onLeave" @mousemove="onMove">
    <n-card
      v-if="selectedPost"
      :lang="selectedPost?.lang as string"
      :title="selectedPost.title"
      class="postModel"
      size="huge"
    >
      <template #header-extra>
        <n-button circle tertiary @click="closePortal">
          <template #icon>
            <n-icon size="20">
              <Cancel />
            </n-icon>
          </template>
        </n-button>
      </template>
      <div class="postCardMain">
        <div class="postCardMeta themeText">
          <time :datetime="selectedPost.time" :lang="lang"
            >{{ formatDate(selectedPost.time) }}
          </time>
          <span class="time-divider">|</span>
          <span :lang="lang">{{ formatTime(selectedPost.time) }}</span>
        </div>
        <div v-for="(block, a) in selectedPost.blocks as PostBlock[]" :key="a" class="postCardBody">
          <div v-if="block.type === 'image'" class="postCardImage">
            <div
              v-for="img in block.content as ImageContent[]"
              :key="img.src"
              class="postCardNImage"
            >
              <n-image
                v-if="img.src && changeSpareUrl === false"
                :alt="img.desc"
                :src="img.src"
                class="postCardImg"
                width="120"
              />
              <n-image
                v-if="img.src && changeSpareUrl === true"
                :alt="img.desc"
                :src="img.spareUrl"
                class="postCardImg"
                width="120"
              />
              <div v-if="img.desc" class="postCardImageDesc">
                <span :lang="selectedPost?.lang as string" class="themeText">{{ img.desc }}</span>
              </div>
            </div>
          </div>
          <div v-if="block.type === 'divider'" class="divider">
            <div class="separator-icon"><span>✦</span></div>
          </div>
          <div v-if="block.type === 'text'" class="postCardText">
            <RichTextRenderer
              :lang="selectedPost?.lang as string"
              :tokens="parseRichText(block.content as string)"
            />
          </div>
        </div>
      </div>
    </n-card>
  </n-modal>
</template>

<style lang="scss">
@use "sass:color";

.separator-icon {
  display: flex;
  align-items: center;
  text-align: center;
  color: rgba(255, 255, 255, 0.85);
  margin: 0.5rem 0;
  font-weight: bold;
}

.separator-icon::before,
.separator-icon::after {
  content: "";
  flex: 1;
  border-bottom: 2px solid rgba(255, 255, 255, 0.6);
}

.separator-icon span {
  padding: 0 20px;
  font-size: 14px;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
}

.postCardImageDesc {
  display: flex;
  flex-direction: column;
  justify-content: center;
  white-space: pre-line;
  text-align: center;
}

.n-modal-container {
  .postModel.n-card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    max-height: 92dvh;

    :deep(.n-card-header) {
      flex-shrink: 0;
    }
  }
}

$text-color: #191919;
$border-radius: 16px;

.postCardImage {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: wrap !important;
  justify-content: center !important;
  margin: 0.5rem 0;
  gap: 1rem;

  .postCardNImage {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: flex-end !important;
    width: fit-content;
    height: auto;

    .postCardImg img {
      z-index: 3;
      margin: 0 !important;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .postCardImageDesc {
      margin-top: 0.3rem;

      span {
        word-break: break-all;
        white-space: pre-line;
        font-size: 0.92rem;
        -webkit-text-stroke: 0.1px var(--global-theme-color-deep);
        text-align: center;
        display: block;
      }
    }
  }
}

.postModel {
  margin-bottom: 4em;
  margin-top: 4em;
  max-width: 92%;
  --mx: -100px;
  --my: -100px;
  --opacity: 0;
  position: relative;
  overflow: hidden;
  transition:
    transform 0.2s,
    background-color 0.3s;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    background: radial-gradient(
      400px circle at var(--mx) var(--my),
      rgba(251, 238, 241, 0.12),
      transparent 65%
    );
    opacity: var(--opacity);
    transition: opacity 0.4s ease;
    pointer-events: none;
  }

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 2px;
    -webkit-mask-image: linear-gradient(#fff 0 0), linear-gradient(#fff 0 0);
    mask-image: linear-gradient(#fff 0 0), linear-gradient(#fff 0 0);
    -webkit-mask-clip: content-box, border-box;
    mask-clip: content-box, border-box;
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    background: radial-gradient(
      180px circle at var(--mx) var(--my),
      rgba(251, 238, 241, 0.75),
      rgba(251, 238, 241, 0.25) 30%,
      transparent 70%
    );

    z-index: 2;
    opacity: var(--opacity);
    transition: opacity 0.4s ease;
    pointer-events: none;
  }

  @media (max-width: 900px) {
    max-width: 98%;
  }

  .postCardMain {
    flex-direction: column;
    min-height: 0;
    display: flex;
    width: 100%;
    justify-content: center;
    font-size: 1.2rem;

    .postCardMeta {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.5em;
      margin-bottom: 0.5em;
      font-size: 0.95rem;
      -webkit-text-stroke: 0.1px var(--global-theme-color-deep);
    }
  }
}

.post-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0.5rem 4rem 0.5rem;
}

.content {
  position: relative;
  z-index: 10; // 必须高于伪元素
  width: 100%;
}

.post-card {
  display: flex;
  flex-direction: column;
  cursor: pointer;
  -webkit-backdrop-filter: blur(15px);
  border-radius: $border-radius;
  padding: 0.8rem;

  // 核心变量
  --mx: -100px;
  --my: -100px;
  --opacity: 0; // 默认光是隐藏的
  position: relative;
  overflow: hidden;
  transition:
    transform 0.2s,
    background-color 0.3s;

  @media (max-width: 900px) {
  }
  @media (min-width: 900px) {
    width: 25rem;
  }
  // 1. 面光 (Surface Glow) - 柔和的大范围光晕
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    background: radial-gradient(
      160px circle at var(--mx) var(--my),
      rgba(251, 238, 241, 0.1),
      transparent 65%
    );
    opacity: var(--opacity);
    transition: opacity 0.4s ease;
    pointer-events: none;
  }

  // 2. 边框光 (Border Glow)
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px; // 边框粗细

    // 1. 定义遮罩源（IDE 现在能理解 mask-image 接受渐变了）
    // noinspection CssInvalidPropertyValue
    -webkit-mask-image: linear-gradient(#fff 0 0), linear-gradient(#fff 0 0);
    mask-image: linear-gradient(#fff 0 0), linear-gradient(#fff 0 0);

    // 2. 分别指定裁剪区域
    // 第一层对应 content-box，第二层对应 border-box
    // noinspection CssInvalidPropertyValue
    -webkit-mask-clip: content-box, border-box;
    mask-clip: content-box, border-box;

    // 3. 核心：排除操作
    // Webkit 使用 xor，标准使用 exclude
    -webkit-mask-composite: xor;
    mask-composite: exclude;

    // 4. 背景光斑逻辑（保持不变）
    background: radial-gradient(
      120px circle at var(--mx) var(--my),
      rgba(251, 238, 241, 0.7),
      rgba(251, 238, 241, 0.2) 30%,
      transparent 70%
    );

    z-index: 2;
    opacity: var(--opacity);
    transition: opacity 0.4s ease;
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-4px);
    transition:
      transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
      box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  }

  .post-header {
    text-align: center;
    margin-bottom: 0.4rem;
    width: 100%;

    .post-title {
      display: block;
      min-width: 0;
      font-size: 1.25rem;
      font-weight: bold;
      margin: 0 0 0.4rem 0;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .post-meta {
      display: flex;
      justify-content: center;
      align-items: center;
      color: color.adjust($text-color, $lightness: 80%);
      text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.9);
      font-size: 1em;
      gap: 0.3rem;
      line-height: 1;

      .n-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 1em;
        transform: translateY(1px);

        svg {
          display: block;
          stroke: rgba(0, 0, 0, 0.5);
          stroke-width: 1px;
        }
      }

      .time-divider {
        display: flex;
        align-items: center;
        height: 1em;
        transform: translateY(-1px);
      }
    }
  }

  .post-body {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    overflow: hidden;
    flex: 1;

    @media (max-width: 900px) {
      flex-direction: column;
      align-items: center;
    }

    .post-image {
      display: flex;
      justify-content: center;

      img {
        z-index: 3;
        width: 120px;
        flex-shrink: 0;
        height: 120px;
        object-fit: cover;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        margin: 0 0.25rem;
      }

      .secondImg {
        z-index: 3;
        @media (min-width: 900px) {
          display: none;
        }
        @media (max-width: 300px) {
          display: none;
        }
      }
    }

    .post-description {
      display: flex;
      flex: 1;
      min-width: 0;

      &.expanded-text p {
        @media (max-width: 900px) {
          -webkit-line-clamp: 11;
          line-clamp: 11;
        }
        @media (min-width: 900px) {
          -webkit-line-clamp: 8;
          line-clamp: 8;
        }
      }

      p {
        max-height: 100%;
        margin: 0;
        line-height: 1.4;
        font-size: 0.8rem;
        word-break: break-all;
        white-space: normal;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        overflow: hidden;
        letter-spacing: 0.02em;
        box-orient: vertical; //test values
        @media (max-width: 900px) {
          -webkit-line-clamp: 4;
          line-clamp: 4;
        }
        @media (min-width: 900px) {
          -webkit-line-clamp: 8;
          line-clamp: 8;
        }
      }
    }
  }
}

.postCardText {
  font-size: 1.1rem;
  white-space: pre-line;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;

  .loader {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .n-alert {
      --n-border: none !important;
      --n-color: rgba(251, 238, 241, 0.4) !important;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      --n-title-text-color: rgb(31, 34, 37) !important;
      --n-content-text-color: rgb(51, 54, 57) !important;
      --n-padding: 13px !important;
      --n-icon-color: #d03050 !important;
      transition: all 0.3s var(--n-bezier);

      &:hover {
        background-color: rgba(251, 238, 241, 0.6) !important;
      }
    }

    .alert {
      margin-bottom: 0;
    }

    p {
      text-align: center;
      font-size: 3rem;
      color: #eaeaea;
      font-weight: normal;
      text-shadow:
        0.5px 0 0 rgba(0, 0, 0, 0.7),
        -0.5px 0 0 rgba(0, 0, 0, 0.7),
        0 0.5px 0 rgba(0, 0, 0, 0.7),
        0 -0.5px 0 rgba(0, 0, 0, 0.7);
      opacity: 0.8;
      animation: loading-pulse 1.5s infinite ease-in-out;
    }
  }
}

@keyframes loading-pulse {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.9;
  }
}
</style>
