<script lang="ts" setup>
import { Component, computed, defineAsyncComponent, onMounted, ref, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
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
import blogI18nData from "@/data/I18N/blogI18n.json";
import { $message } from "@/components/ts/msgUtils.ts";
import { PushPinSharp } from "@vicons/material";
import { useContentStore } from "./ts/contentStore";

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

const route = useRoute();
const router = useRouter();
const posts = ref<Post[]>([]);
const selectedPost = ref<Post | null>(null);
const showModal = ref<boolean>(false);

const RichTextRenderer: Component = defineAsyncComponent(
  () => import("@/components/RichTextRenderer.vue"),
);
type WebTitleMap = Record<string, Record<string, string>>;
const newWebTitle = shallowRef<WebTitleMap>({});
const updatePageTitle = () => {
  const currentLang = lang.value;
  if (showModal.value && selectedPost.value) {
    document.title =
      selectedPost.value.title + " - " + newWebTitle.value["blog"]?.[currentLang] || "Blog";
  } else {
    document.title = newWebTitle.value["blog"]?.[currentLang] || "Default Title";
  }
};
watch([showModal, lang, selectedPost], () => {
  updatePageTitle();
});

const syncModalWithRoute = async () => {
  const routeId = route.params.id as string | undefined;
  if (routeId) {
    const targetPost = posts.value.find((p: Post) => p.id === routeId);
    if (targetPost) {
      selectedPost.value = targetPost;
      showModal.value = true;
    } else {
      $message.warning(blogDisplay.value.unknownPostId, true, 4000);
      await router.replace({ name: "blog" });
    }
  } else {
    showModal.value = false;
  }
};

onMounted(async () => {
  try {
    const [postsData, titleData] = await Promise.all([
      getPosts<Post>("blog"),
      getSingle<WebTitleMap>("main", "webTitle.json"),
    ]);
    if (postsData) posts.value = postsData;
    if (titleData) newWebTitle.value = titleData;
    await syncModalWithRoute();
    updatePageTitle();
  } catch (err) {
    console.error("Initialization failed:", err);
  }
});

watch(
  () => route.params.id,
  async () => {
    if (posts.value.length > 0) {
      await syncModalWithRoute();
    }
  },
);

watch(
  () => showModal.value,
  async (isOpen: boolean) => {
    if (!isOpen && route.params.id) {
      await router.push({ name: "blog" });
    }
  },
);

const blogDisplay = computed(() => {
  const currentLang = lang.value;
  const source = blogI18nData as Record<string, Record<string, string>>;
  const displayObj: Record<string, string> = {};

  Object.keys(source).forEach((key) => {
    const translations = source[key];
    displayObj[key] =
      translations[currentLang] ||
      translations["en"] ||
      translations["other"] ||
      Object.values(translations)[0];
  });

  return displayObj;
});

const cardClick = async (post: Post) => {
  if (!post.id) {
    $message.warning(blogDisplay.value.errorPostId, true, 4000);
    return;
  }
  await router.push({ name: "blog", params: { id: post.id } });
};

const closePortal = () => {
  showModal.value = false;
};

const { onMove, onLeave, onEnter } = useCardGlow();

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

watch(
  () => yamlLoadingFault.value,
  (v: boolean) => {
    if (v) {
      $message.warning(blogDisplay.value.partialLoadError, true, 4000);
    }
  },
);
watch(
  () => listPrimaryError.value,
  (v: boolean) => {
    if (v) {
      $message.warning(blogDisplay.value.listPrimaryError, true, 4000);
    }
  },
);

watch(
  () => changeSpareUrl.value,
  (v: boolean) => {
    if (v && !listPrimaryError.value) {
      $message.warning(blogDisplay.value.changeToSpareUrl, true, 4000);
    }
  },
);
</script>

<template>
  <div v-if="!yamlLoading" class="post-container">
    <article
      v-for="post in posts"
      :key="post.time"
      class="post-card glass"
      @click="() => cardClick(post)"
      @mouseenter="onEnter"
      @mouseleave="onLeave"
      @mousemove="onMove"
    >
      <div class="content">
        <div class="post-header">
          <h2 class="post-title commonText">
            {{ post.title }}
          </h2>
          <div class="post-meta">
            <n-icon v-if="post.pin" size="15">
              <PushPinSharp></PushPinSharp>
            </n-icon>
            <span v-if="post.pin" class="time-divider">|</span>
            <time :datetime="post.time">{{ formatDate(post.time!) }}</time>
            <span class="time-divider">|</span>
            <span>{{ formatTime(post.time) }}</span>
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
                :alt="post.title"
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
            <p class="commonText">
              {{ getDescriptionText(post.blocks as PostBlock[]) }}
            </p>
          </div>
        </div>
      </div>
    </article>
  </div>

  <div v-else class="loading-state">
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

      <p v-else>
        {{ blogDisplay.loading }}
      </p>
    </div>
  </div>

  <n-modal v-show="showModal" v-model:show="showModal">
    <n-card v-if="selectedPost" :title="selectedPost!.title" class="postModel" size="huge">
      <template #header-extra>
        <n-button circle tertiary @click="closePortal">
          <template #icon>
            <n-icon size="20">
              <Cancel></Cancel>
            </n-icon>
          </template>
        </n-button>
      </template>
      <div class="postCardMain">
        <div class="postCardMeta themeText">
          <time :datetime="selectedPost.time">{{ formatDate(selectedPost.time) }}</time>
          <span class="time-divider">|</span>
          <span>{{ formatTime(selectedPost.time) }}</span>
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
                :src="img.src"
                class="postCardImg"
                width="120"
              />
              <n-image
                v-if="img.src && changeSpareUrl === true"
                :src="img.spareUrl"
                class="postCardImg"
                width="120"
              />
              <div v-if="img.desc" class="postCardImageDesc">
                <span class="themeText">{{ img.desc }}</span>
              </div>
            </div>
          </div>
          <div v-if="block.type === 'text'" class="postCardText">
            <RichTextRenderer :tokens="parseRichText(block.content as string)" />
          </div>
        </div>
      </div>
    </n-card>
  </n-modal>
</template>

<style lang="scss">
@use "sass:color";
.postCardImageDesc {
  display: flex;
  flex-direction: column;
  justify-content: center;
  white-space: pre-line;
  text-align: center;
}

.n-modal-container .postModel {
  max-height: 84.4dvh;

  .n-card__content {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding-left: 1.5rem;
    padding-right: 1.5rem;
    scrollbar-gutter: stable both-edges;
  }

  .n-card-header__main {
    text-align: center;
  }
}

.postCardImg img {
  margin: 1em;
}
$text-color: #191919;
$border-radius: 16px;

.postCardImage {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: wrap !important;
  justify-content: center !important;
  margin: 1rem 0;
  gap: 1.5rem;

  .postCardNImage {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: flex-end !important;
    width: fit-content;
    height: auto;

    .postCardImg img {
      margin: 0 !important;
      border-radius: 8px;
    }

    .postCardImageDesc {
      margin-top: 0.5rem;

      span {
        word-break: break-all;
        white-space: pre-line;
        font-size: 0.9rem;
        -webkit-text-stroke: 0.05px var(--global-theme-color-deep);
        text-align: center;
        display: block;
      }
    }
  }
}

.postModel {
  margin-bottom: 4em;
  margin-top: 4em;
  max-width: 85%;
  @media (max-width: 900px) {
    max-width: 98%;
  }

  .postCardMain {
    flex-direction: column;
    display: flex;
    width: 100%;
    justify-content: center;
    font-size: 1.05rem;

    .postCardMeta {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.5em;
      margin-bottom: 0.5em;
      font-size: 0.92rem;
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
    height: 15.9rem;
  }
  @media (min-width: 900px) {
    width: 25rem;
    height: 12.3rem;
  }
  // 1. 面光 (Surface Glow) - 柔和的大范围光晕
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    background: radial-gradient(
      800px circle at var(--mx) var(--my),
      rgba(255, 255, 255, 0.15),
      transparent 40%
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
      150px circle at var(--mx) var(--my),
      rgba(255, 255, 255, 1),
      rgba(255, 255, 255, 0.3) 30%,
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
    margin-bottom: 0.5rem;
    width: 100%;

    .post-title {
      display: block;
      min-width: 0;

      font-size: 1.25rem;
      font-weight: 700;
      margin: 0 0 0.5rem 0;
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
      font-size: 15px;
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
    align-items: flex-start;
    overflow: hidden;
    flex: 1;

    // 移动端自动转为垂直布局
    @media (max-width: 900px) {
      flex-direction: column;
      align-items: center;
    }

    .post-image {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
      width: 120px;

      img {
        width: 120px;
        flex-shrink: 0;
        height: 120px;
        object-fit: cover;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        margin-left: 0.25rem;
        margin-right: 0.25rem;
      }

      .secondImg {
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
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
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
      font-weight: 350;
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
