<script lang="ts" setup>
import {
  computed,
  Directive,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  VNodeChild,
  watch,
} from "vue";
import { useRouter } from "vue-router";
import {
  changeSpareUrl,
  faultTimes,
  listSpareError,
  notFoundError,
  serverError,
  yamlLoading,
  yamlRetrying,
} from "@/components/ts/getYaml";
import { formatDate, formatTime, lang } from "@/components/ts/setupLang.ts";
import Cancel from "@/icons/cancel.svg";
import { NAlert, NButton, NCard, NIcon, NImage, NModal } from "naive-ui";
import { useCardGlow } from "@/components/ts/animationCalculate.ts";
import { $message } from "@/components/ts/msgUtils.ts";
import { PushPinSharp } from "@vicons/material";
import {
  blogDisplay,
  currentPostTitle,
  parsedBlocks,
  posts,
  processedPosts,
  selectedPost,
  showModal,
} from "@/components/ts/useGlobalState.ts";
import { getSlug, useRouteModal } from "@/components/ts/useRouteModal.ts";
import RichTextRenderer from "@/components/blog/RichTextRenderer.vue";
import { ImageContent, Post, PostBlock, ProcessedPost, TextToken } from "../ts/d.ts";
import { isSSR } from "../ts/useHead.ts";
import LazyBlock from "@/components/blog/LazyBlock.vue";

const hydrated = ref(false);
const visibleIds = ref(new Set<string>());
const isHydrated = ref(false);
let observer: IntersectionObserver | null = null;

const getPostId = (post: ProcessedPost) => {
  return getSlug(post) || post.time || post.title;
};

const initObserver = () => {
  if (observer) observer.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = (entry.target as HTMLElement).dataset.id;
          if (id) {
            visibleIds.value.add(id);
            visibleIds.value = new Set(visibleIds.value);
            observer?.unobserve(entry.target);
          }
        }
      });
    },
    { root: null, rootMargin: "300px", threshold: 0.01 },
  );

  document.querySelectorAll(".post-card[data-id]").forEach((el) => {
    observer?.observe(el);
  });
};

onMounted(async () => {
  isHydrated.value = true;
  hydrated.value = true;
  await nextTick(() => {
    initObserver();
  });
});

watch(
  () => processedPosts.value.length,
  async () => {
    await nextTick(() => initObserver());
  },
);

onBeforeUnmount(() => {
  if (observer) observer.disconnect();
});

const isVisible = (post: ProcessedPost, index: number) => {
  if (!isHydrated.value) return true;
  if (index < 10) return true;
  return visibleIds.value.has(getPostId(post));
};

const ssrHidePosts = computed(() => !(isSSR && selectedPost.value));
const { onMove, onLeave, onEnter } = useCardGlow();
const router = useRouter();
const handleImgError = (e: Event, spareUrl?: string) => {
  const target = e.target as HTMLImageElement;
  if (spareUrl) target.src = spareUrl;
};
const handleModalFinishedLeaving = () => {
  if (!showModal.value) {
    parsedBlocks.value = [];
  }
};
const blogModals = computed(() => {
  const map: Record<string, typeof showModal> = {};
  posts.value.forEach((post) => {
    const slug = getSlug(post);
    if (slug) map[slug] = showModal;
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
    await router.replace({ name: "blog" });
  },
});

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

const vA11y: Directive = {
  mounted(el: HTMLElement) {
    const header = el.querySelector(".n-card-header");
    const main = el.querySelector(".n-card-header__main");
    if (header) header.setAttribute("aria-level", "2");
    if (main) main.setAttribute("aria-level", "2");
  },
};

type PostRenderContext = {
  post: ProcessedPost;
};
type PostsRenderer = (
  block: PostBlock,
  ctx: PostRenderContext,
  tokensFromSlot?: TextToken[],
) => VNodeChild | null;

const PostsRenderers: Record<string, PostsRenderer> = {
  image: (block, ctx) => {
    if (!Array.isArray(block.content)) return null;

    return h(
      "div",
      { class: "postCardImage" },
      block.content.map((img: ImageContent) =>
        h("div", { key: img.src, class: "postCardNImage" }, [
          isHydrated.value
            ? h(NImage, {
                alt: img.desc,
                src: changeSpareUrl.value && img.spareUrl ? img.spareUrl : img.src,
                lazy: true,
                class: "postCardImg",
                width: 120,
              })
            : h("div", { class: "n-image", style: { width: "120px" } }, [
                h("img", {
                  src: img.src,
                  alt: img.desc,
                  class: "postCardImg",
                  style: {
                    width: "120px",
                    borderRadius: "8px",
                    objectFit: "cover",
                  },
                  onError: (e: Event) => handleImgError(e, img.spareUrl),
                }),
              ]),

          img.desc &&
            h("div", { class: "postCardImageDesc" }, [
              h(
                "span",
                {
                  lang: ctx.post.lang || lang.value,
                  class: "themeText",
                  style: { display: "block", textAlign: "center" },
                },
                img.desc,
              ),
            ]),
        ]),
      ),
    );
  },

  divider: () =>
    h("div", { class: "divider" }, [h("div", { class: "separator-icon" }, [h("span", "✦")])]),

  text: (block, ctx, tokensFromSlot) =>
    h("div", { class: "postCardText" }, [
      h(RichTextRenderer, {
        lang: ctx.post.lang || lang.value,
        tokens: tokensFromSlot && tokensFromSlot.length > 0 ? tokensFromSlot : block.tokens || [],
      }),
    ]),
};
const renderInnerContent = (
  block: PostBlock,
  ctx: PostRenderContext,
  tokensFromSlot?: TextToken[],
): VNodeChild[] => {
  const PostsRenderer = PostsRenderers[block.type];
  if (!PostsRenderer) return [];

  const vNode = PostsRenderer(block, ctx, tokensFromSlot);
  return vNode ? [vNode] : [];
};
const renderDetailContent = (): VNodeChild => {
  const post = selectedPost.value as ProcessedPost | null;
  if (!post) return null;

  const blocks = parsedBlocks.value || [];

  return h("div", { class: "postCardMain" }, [
    h("div", { class: "postCardMeta themeText" }, [
      h("time", { datetime: post.time, lang: lang.value }, formatDate(post.time)),
      h("span", { class: "time-divider" }, "|"),
      h("span", { lang: lang.value }, formatTime(post.time)),
    ]),

    blocks.map((block: PostBlock, a: number) => {
      const ctx: PostRenderContext = { post };

      return h("div", { key: a, class: "postCardBody" }, [
        h(
          LazyBlock,
          { block: block, ssr: isSSR },
          {
            default: (slotProps: unknown): VNodeChild[] => {
              const props = slotProps as { combinedTokens: TextToken[] };
              return renderInnerContent(block, ctx, props.combinedTokens);
            },
          },
        ),
      ]);
    }),
  ]);
};
</script>

<template>
  <div v-if="ssrHidePosts" class="post-container">
    <article
      v-for="(post, index) in processedPosts"
      :key="getPostId(post)"
      class="post-card glass"
      @mouseenter="onEnter"
      @mouseleave="onLeave"
      @mousemove="onMove"
    >
      <router-link
        :aria-label="post.title"
        :to="{ name: 'blog', params: { id: getSlug(post) || 'error' } }"
        class="post-card-click-overlay"
        @click.prevent.stop="cardClick(post)"
      >
      </router-link>
      <div class="postContent">
        <template v-if="isVisible(post, index)">
          <div class="post-header">
            <h2 :lang="post?.lang || lang" class="post-title commonText">
              {{ post.title }}
            </h2>
            <div class="post-meta">
              <n-icon v-if="String(post.pin).toLowerCase() === 'true'" size="15">
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
              <p :lang="post?.lang || lang" class="commonText">
                {{ post.displayDescription }}
              </p>
            </div>
          </div>
        </template>
        <div v-else class="post-skeleton">
          <div class="skeleton-header">
            <div class="skeleton-title"></div>
            <div class="skeleton-meta"></div>
          </div>
          <div class="skeleton-body">
            <div class="skeleton-image"></div>
            <div class="skeleton-description">
              <div class="skeleton-text-line line-1"></div>
              <div class="skeleton-text-line line-2"></div>
              <div class="skeleton-text-line line-3"></div>
              <div class="skeleton-text-line line-4"></div>
            </div>
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
      <n-alert
        v-else-if="notFoundError"
        :title="blogDisplay.notFoundError"
        class="alert"
        type="error"
      >
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

  <article v-if="isSSR && selectedPost" class="sr-only-article">
    <h1 :lang="(selectedPost?.lang as string) || lang">{{ selectedPost.title }}</h1>
    <time :datetime="selectedPost.time?.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')" :lang="lang">
      {{ selectedPost.time?.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3") }}
    </time>
    <component :is="renderDetailContent()" />
  </article>

  <n-modal
    v-model:show="showModal"
    :on-after-leave="handleModalFinishedLeaving"
    to="#modal-target"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @mousemove="onMove"
  >
    <n-card
      v-if="selectedPost"
      v-a11y
      :lang="(selectedPost?.lang as string) || lang"
      class="postModel"
      size="huge"
    >
      <template #header>
        <h2 :lang="(selectedPost?.lang as string) || lang" class="postCardTitle">
          {{ selectedPost.title }}
        </h2>
      </template>
      <template #header-extra>
        <n-button aria-label="Close" circle tertiary @click="closePortal">
          <template #icon>
            <n-icon size="20">
              <Cancel />
            </n-icon>
          </template>
        </n-button>
      </template>

      <component :is="renderDetailContent()" v-if="isHydrated" />
    </n-card>
  </n-modal>
</template>

<style lang="scss">
$text-color: #2b2628;
$border-radius: 16px;
@use "sass:color";
.post-card-click-overlay {
  position: absolute;
  inset: 0;
  display: block;
  opacity: 0;
  z-index: 5;
  background: transparent;
  text-decoration: none;
  color: transparent;
  -webkit-tap-highlight-color: transparent;
  border-radius: $border-radius;
  overflow: hidden;
}

.sr-only-article {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.post-skeleton {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  padding: 0.8rem;
  border-radius: $border-radius;
  background: rgba(var(--global-theme-rgb-deep), 0.05);
  backdrop-filter: blur(15px);
  gap: 0.5rem;
  @media (min-width: 900px) {
    width: 25rem;
    height: 210px;
  }

  .skeleton-title,
  .skeleton-meta,
  .skeleton-image,
  .skeleton-text-line {
    background: linear-gradient(
      90deg,
      rgba(var(--global-theme-rgb-deep), 0.06) 25%,
      rgba(var(--global-theme-rgb-deep), 0.12) 37%,
      rgba(var(--global-theme-rgb-deep), 0.06) 63%
    );
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite linear;
    border-radius: 8px;
  }

  .skeleton-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 0.4rem;
    gap: 0.4rem;

    .skeleton-title {
      width: 70%;
      height: 1.25rem;
    }

    .skeleton-meta {
      width: 40%;
      height: 1rem;
    }
  }

  .skeleton-body {
    display: flex;
    gap: 0.5rem;
    flex: 1;
    @media (max-width: 900px) {
      flex-direction: column;
      align-items: center;
    }

    .skeleton-image {
      width: 120px;
      height: 120px;
      flex-shrink: 0;
      border-radius: 12px;
    }

    .skeleton-description {
      display: flex;
      flex-direction: column;
      flex: 1;
      width: 100%;
      gap: 0.5rem;
      justify-content: center;

      .skeleton-text-line {
        height: 0.8rem;

        &.line-1 {
          width: 100%;
        }

        &.line-2 {
          width: 95%;
        }

        &.line-3 {
          width: 90%;
        }

        &.line-4 {
          width: 40%;
        }
      }
    }
  }
}

.postCardTitle {
  padding: 0;
  font-size: 1.2rem;
  margin: 0;
  font-weight: bold;
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
        font-weight: 400;
        text-align: center;
        display: block;
      }
    }
  }
}

.postModel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 99dvh !important;

  :deep(.n-card-header) {
    flex-shrink: 0;
  }

  max-width: 99%;
  @media (min-width: 1050px) {
    max-width: 75em !important;
  }
  --mx: -100px;
  --my: -100px;
  --opacity: 0;
  position: relative;
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
      font-weight: 500;
    }
  }
}

.post-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  align-items: stretch;
  gap: 0.6rem;
  padding: 1rem 0.5rem 4rem 0.5rem;
}

.postContent {
  position: relative;
  z-index: 3;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.post-card {
  display: flex;
  flex-direction: column;
  width: 100%;
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
    transform: translateY(-2px);
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
      color: var(--global-theme-color-deep) !important;
      font-weight: 500;
      paint-order: stroke fill;
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
          stroke: rgb(var(--global-theme-color-deep));
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
      font-weight: 500;
      color: var(--direct-font-color);
      text-shadow: var(--direct-font-shadow);
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
