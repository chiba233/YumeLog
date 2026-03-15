<script lang="ts" setup>
import { computed, onMounted, onServerPrefetch, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useHead } from "@unhead/vue";
import {
  changeSpareUrl,
  faultTimes,
  listPrimaryError,
  listSpareError,
  loadError,
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
  selectedPost,
  WebTitleMap,
} from "@/components/ts/useGlobalState.ts";
import { useRouteModal } from "@/components/ts/useRouteModal.ts";
import { personRawData } from "@/components/ts/setupJson.ts";
import RichTextRenderer from "@/components/RichTextRenderer.vue";
import { ImageContent, Post, PostBlock, ProcessedPost, TextToken } from "./ts/d";

const router = useRouter();
const { getPosts, getSingle } = useContentStore();
const { onMove, onLeave, onEnter } = useCardGlow();

const posts = ref<Post[]>([]);
const showModal = ref(false);
const route = useRoute();
const getSlug = (post?: Post | null) =>
  post?.id ??
  post?.title
    ?.trim()
    .replace(/[\/\\?#]/g, "")
    .replace(/\s+/g, "-");
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
  const text = blocks
    .filter((b) => b.type === "text" || b.type === "center")
    .map((b) => (typeof b.content === "string" ? stripRichText(b.content) : ""))
    .join(" ");
  return text.slice(0, 350);
};

const handleImgError = (e: Event, spareUrl?: string) => {
  const target = e.target as HTMLImageElement;

  if (spareUrl) target.src = spareUrl;
};

const blogModals = computed(() => {
  const map: Record<string, typeof showModal> = {};

  posts.value.forEach((post) => {
    const slug = getSlug(post);
    if (slug) {
      map[slug] = showModal;
    }
  });

  return map;
});

const blogHandlers = computed(() => {
  const handlers: Record<string, () => void> = {};

  posts.value.forEach((post) => {
    const slug = getSlug(post);
    if (!slug) return;
    handlers[slug] = () => {
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
  posts.value.map((post) => {
    const blocks = post.blocks ?? [];
    const imageBlocks = blocks.filter((b) => b.type === "image");
    return {
      ...post,
      blocks,
      imageBlocks,
      displayDescription: getDescriptionText(blocks),
    };
  }),
);

const cardClick = (post: Post) => {
  const slug = getSlug(post);
  if (!slug) {
    $message.warning(blogDisplay.value.errorPostId, true, 3000);
    return;
  }

  void openModal(slug);
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
    if (!showModal.value || (!selectedPost.value?.id && !selectedPost.value?.title)) {
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
        href: `${siteOrigin}/blog/${getSlug(selectedPost.value)}`,
      },
    ];
  }),

  script: computed(() => {
    if (!isSSR) return [];
    if (showModal.value && selectedPost.value) {
      const blocks = selectedPost.value?.blocks ?? [];
      const firstImg = (getImageBlocks(blocks)?.[0]?.content as ImageContent[])?.[0]?.src ?? "";
      const post = selectedPost.value;
      return [
        {
          type: "application/ld+json",
          innerHTML: JSON.stringify({
            "@context": "https://schema.org",
            "@id": `${siteOrigin}/blog/${getSlug(selectedPost.value)}`,
            url: `${siteOrigin}/blog/${getSlug(selectedPost.value)}`,
            "@type": "BlogPosting",
            headline: post.title,
            datePublished: post.time?.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"),
            image: firstImg,
            author: {
              "@type": "Person",
              name: personRawData.value?.author[lang.value] ?? personRawData.value?.author?.en,
            },
            publisher: {
              "@type": "Organization",
              name: personRawData.value?.author[lang.value] ?? personRawData.value?.author?.en,
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `${siteOrigin}/blog/${getSlug(selectedPost.value)}`,
            },
          }),
        },
      ];
    }

    return [
      {
        type: "application/ld+json",
        innerHTML: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          blogPost: posts.value.map((post) => ({
            "@type": "BlogPosting",
            headline: post.title,
            url: `${siteOrigin}/blog/${getSlug(post)}`,
            datePublished: post.time?.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"),
            author: {
              "@type": "Person",
              name: personRawData.value?.author[lang.value] ?? personRawData.value?.author?.en,
            },
          })),
        }),
      },
    ];
  }),

  meta: computed(() => {
    if (!showModal.value || !selectedPost.value) {
      return [
        {
          name: "description",
          content: baseTitle.value,
        },
        {
          property: "og:url",
          content: `${siteOrigin}/blog`,
        },
        {
          property: "og:type",
          content: "website",
        },
      ];
    }

    const blocks = selectedPost.value?.blocks ?? [];

    const desc = getDescriptionText(blocks);

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
        property: "article:published_time",
        content: selectedPost.value.time?.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"),
      },
      {
        property: "og:type",
        content: "article",
      },
      {
        property: "og:url",
        content: `${siteOrigin}/blog/${getSlug(selectedPost.value)}`,
      },
    ];
  }),
});

const richTextCache = new WeakMap<PostBlock, TextToken[]>();
const parsedBlocks = computed<PostBlock[]>(() => {
  if (!selectedPost.value?.blocks) return [];
  return selectedPost.value.blocks.map((block) => {
    if (block.type === "text") {
      let tokens = richTextCache.get(block);
      if (!tokens) {
        tokens = parseRichText(block.content as string);
        richTextCache.set(block, tokens);
      }
      return {
        ...block,
        tokens,
      };
    }
    return block;
  });
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
const getPreviewImages = (post: ProcessedPost): ImageContent[] => {
  const blocks = post.imageBlocks?.slice(0, 2) ?? [];
  return blocks
    .flatMap((block) =>
      Array.isArray(block.content)
        ? block.content.filter((img): img is ImageContent => !!img?.src)
        : [],
    )
    .slice(0, 4);
};
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
      @click="cardClick(post)"
      @mouseenter="onEnter"
      @mouseleave="onLeave"
      @mousemove="onMove"
    >
      <div class="postContent">
        <div class="post-header">
          <h2 :lang="post?.lang as string" class="post-title commonText">{{ post.title }}</h2>
          <div class="post-meta">
            <n-icon v-if="post.pin === true || (post.pin as unknown) === 'true'" size="15">
              <PushPinSharp />
            </n-icon>
            <span v-if="post.pin" class="time-divider">|</span>
            <time :datetime="post.time" :lang="lang">{{ formatDate(post.time!) }}</time>
            <span class="time-divider">|</span>
            <span :lang="lang">{{ formatTime(post.time) }}</span>
          </div>
        </div>

        <div class="post-body">
          <div v-if="post.imageBlocks.length > 0" class="post-image">
            <img
              v-for="(img, i) in getPreviewImages(post)"
              :key="img.src"
              :alt="img.desc"
              :class="{ secondImg: i === 1, thirdImg: i === 2, fourthImg: i === 3 }"
              :src="img.src"
              loading="lazy"
              @error="(e) => handleImgError(e, img.spareUrl)"
            />
          </div>

          <div :class="{ 'expanded-text': !post.imageBlocks.length }" class="post-description">
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
  <div v-if="isSSR && selectedPost" style="position: absolute; left: -9999px">
    <article>
      <h1 :lang="selectedPost?.lang as string">{{ selectedPost.title }}</h1>
      <time
        :lang="lang"
        :datetime="selectedPost.time?.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')"
      >
        {{ selectedPost.time?.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3") }}
      </time>
      <span :lang="lang">{{ formatTime(selectedPost.time) }}</span>
      <div v-for="(block, index) in parsedBlocks" :key="index">
        <div v-if="block.type === 'text'">
          <RichTextRenderer
            v-if="block.tokens"
            :lang="selectedPost?.lang as string"
            :tokens="block.tokens!"
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
  <n-modal
    v-model:show="showModal"
    to="#modal-target"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @mousemove="onMove"
  >
    <n-card v-if="selectedPost" :lang="selectedPost?.lang as string" class="postModel" size="huge">
      <template #header>
        <h2 :lang="selectedPost?.lang as string" class="postCardTitle">
          {{ selectedPost.title }}
        </h2>
      </template>
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
        <div v-for="(block, a) in parsedBlocks" :key="a" class="postCardBody">
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
            <RichTextRenderer :lang="selectedPost?.lang as string" :tokens="block.tokens!" />
          </div>
        </div>
      </div>
    </n-card>
  </n-modal>
</template>

<style lang="scss">
@use "sass:color";
.postCardTitle {
  padding: 0;
  font-size: 1.2rem;
  margin: 0;
  font-weight: normal;
}
.separator-icon {
  display: flex;
  align-items: center;
  text-align: center;
  color: rgba(var(--global-theme-rgb-deep), 0.85);
  margin: 0.5rem 0;
  font-weight: bold;
}

.separator-icon::before,
.separator-icon::after {
  content: "";
  flex: 1;
  height: 2px;
}

.separator-icon::before {
  background: linear-gradient(to right, transparent, rgba(var(--global-theme-rgb-deep), 0.6));
}

.separator-icon::after {
  background: linear-gradient(to right, rgba(var(--global-theme-rgb-deep), 0.6), transparent);
}

.separator-icon span {
  padding: 0 20px;
  font-size: 14px;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
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
    max-height: 96dvh;
    @media (max-width: 500px) {
      max-height: 98dvh;
    }

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
  max-width: 96%;
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
  align-items: stretch;
  gap: 0.8rem;
  padding: 1rem 0.5rem 4rem 0.5rem;
}

.postContent {
  position: relative;
  z-index: 10;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.post-card {
  display: flex;
  flex-direction: column;
  cursor: pointer;
  -webkit-backdrop-filter: blur(15px);
  border-radius: $border-radius;
  padding: 0.8rem;
  --mx: -100px;
  --my: -100px;
  --opacity: 0;
  position: relative;
  overflow: hidden;
  transition:
    transform 0.2s,
    background-color 0.3s;

  @media (min-width: 900px) {
    width: 25rem;
  }

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

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    -webkit-mask-image: linear-gradient(#fff 0 0), linear-gradient(#fff 0 0);
    mask-image: linear-gradient(#fff 0 0), linear-gradient(#fff 0 0);
    -webkit-mask-clip: content-box, border-box;
    mask-clip: content-box, border-box;
    -webkit-mask-composite: xor;
    mask-composite: exclude;
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
    align-items: stretch;
    overflow: hidden;
    flex: 1;

    @media (max-width: 900px) {
      flex-direction: column;
      align-items: center;
    }

    .post-image {
      display: flex;
      justify-content: center;
      align-content: center;
      text-align: center;
      align-items: center;
      flex-shrink: 0;

      img {
        z-index: 3;
        width: 120px;
        height: 120px;
        object-fit: cover;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        margin: 0 0.25rem;
      }
      .thirdImg,
      .secondImg,
      .fourthImg {
        z-index: 3;
        @media (min-width: 900px) {
          display: none;
        }
      }
      .thirdImg {
        @media (max-width: 450px) {
          display: none;
        }
      }
      .secondImg {
        @media (max-width: 300px) {
          display: none;
        }
      }
      .fourthImg {
        @media (max-width: 600px) {
          display: none;
        }
      }
    }

    .post-description {
      display: flex;
      flex: 1;
      min-width: 0;
      align-items: center;

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
