<script lang="ts" setup>
import { Component, computed, defineAsyncComponent, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  changeSpareUrl,
  faultTimes,
  loadAllPosts,
  loadError,
  Post,
  serverError,
  yamlLoading,
  yamlLoadingFault,
  yamlRetrying,
} from "@/components/ts/getYaml.ts";
import { formatTime, lang } from "@/components/ts/useStoage";
import Cancel from "@/icons/cancel.svg";
import { NAlert, NButton, NCard, NIcon, NImage, NModal } from "naive-ui";
import { parseRichText, stripRichText } from "@/components/ts/blogFormat.ts";
import { useCardGlow } from "@/components/ts/animationCalculate.ts";
import blogI18nData from "@/data/I18N/blogI18n.json";
import { $message } from "@/components/ts/msgUtils.ts";
import { PushPinSharp } from "@vicons/material";

const route = useRoute();
const router = useRouter();

const posts = ref<Post[]>([]);
const selectedPost = ref<Post | null>(null);
const showModal = ref<boolean>(false);

const RichTextRenderer: Component = defineAsyncComponent(() =>
  import("@/components/RichTextRenderer.vue"),
);

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
  posts.value = await loadAllPosts("blog");
  await syncModalWithRoute();
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

const getI18nSuffix = (): string => {
  const currentLang = lang.value;
  if (currentLang === "zh") return "ZH";
  if (currentLang === "ja") return "JA";
  if (currentLang === "en") return "EN";
  return "Other";
};

const blogDisplay = computed(() => {
  const suffix = getI18nSuffix();
  const source = blogI18nData as Record<string, string>;
  const displayObj: Record<string, string> = {};

  Object.keys(source).forEach(fullKey => {
    if (fullKey.endsWith(suffix)) {
      const baseKey = fullKey.replace(suffix, "");
      displayObj[baseKey] = source[fullKey];
    }
  });

  Object.keys(source).forEach(fullKey => {
    if (fullKey.endsWith("EN")) {
      const baseKey = fullKey.replace("EN", "");
      if (!displayObj[baseKey]) {
        displayObj[baseKey] = source[fullKey];
      }
    }
  });

  return displayObj;
});

const formatDate = (t: string | undefined): string => {
  if (!t) return "";
  return `${t.slice(0, 4)} - ${t.slice(4, 6)} - ${t.slice(6, 8)}`;
};

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

const { onMove, onLeave } = useCardGlow();

watch(
  () => changeSpareUrl.value,
  (v: boolean) => {
    if (v) {
      $message.warning(blogDisplay.value.changeToSpareUrl, true, 4000);
    }
  }
);
</script>

<template>
  <div v-if="!yamlLoading" class="post-container">
    <article
      v-for="(post) in posts"
      :key="post.time"
      class="post-card"
      @click="() => cardClick(post)" @mouseleave="onLeave"
      @mousemove="onMove"
    >
      <div class="content">
        <div class="post-header">
          <h2 class="post-title">
            {{ post.title }}
          </h2>
          <div class="post-meta">
            <n-icon v-if="post.pin" size="14">
              <PushPinSharp></PushPinSharp>
            </n-icon>
            <span v-if="post.pin" class="time-divider">|</span>
            <time :datetime="post.time">{{ formatDate(post.time!) }}</time>
            <span class="time-divider">|</span>
            <span>{{ formatTime(post.time) }}</span>
          </div>
        </div>

        <div class="post-body">
          <div v-if="post.blocks?.some((b: any) => b.type === 'image')" class="post-image">
            <img
              :alt="post.title"
              :src="post.blocks.filter((b: any) => b.type === 'image')[0]?.content?.[0].src"
              loading="lazy"
              @error="(e) => { (e.target as HTMLImageElement).src = post.blocks.filter((b: any) => b.type === 'image')[0]?.content?.[0].spareUrl }"
            />
            <img
              v-if="post.blocks.filter((b: any) => b.type === 'image')[1]?.content?.[0].src"
              :alt="post.title"
              :src="post.blocks.filter((b: any) => b.type === 'image')[1]?.content?.[0].src"
              class="secondImg"
              loading="lazy"
              @error="(e) => { (e.target as HTMLImageElement).src = post.blocks.filter((b: any) => b.type === 'image')[1]?.content?.[0].spareUrl }"
            />
          </div>
          <div
            :class="{ 'expanded-text': !post.blocks?.some((b: any) => b.type === 'image') }"
            class="post-description">
            <p>
              {{
                (post.blocks || [])
                  .filter((b: any) => b.type === "text" || b.type === "center")
                  .map((b: any) => stripRichText(b.content))
                  .join(" ")
              }}
            </p>
          </div>
        </div>
      </div>
    </article>
  </div>
  <div v-else class="loading-state">
    <div class="loader">
      <n-alert v-if="serverError" title="Error" type="error">
        {{ blogDisplay.serverFault }}
      </n-alert>
      <n-alert v-else-if="loadError" title="Error" type="error">
        {{ blogDisplay.loadError }}
      </n-alert>
      <n-alert v-else-if="yamlLoadingFault" title="Error" type="error">
        {{ blogDisplay.serverFault }}
      </n-alert>
      <n-alert v-else-if="yamlRetrying" title="Warning" type="warning">
        {{ blogDisplay.yamlRetrying }} {{ blogDisplay.retry }} {{ faultTimes }}
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
        <div class="postCardMeta">
          <time :datetime="selectedPost.time">{{ formatDate(selectedPost.time) }}</time>
          <span class="time-divider">|</span>
          <span>{{ formatTime(selectedPost.time) }}</span>
        </div>
        <div v-for="(block,a) in selectedPost.blocks" :key="a" class="postCardBody">
          <div v-if="block.type === 'image'" class="postCardImage">
            <div v-for="img in block.content" :key="img.src" class="postCardNImage">
              <n-image
                v-if="img.src && changeSpareUrl===false"
                :src="img.src"
                class="postCardImg"
                width="120"
              />
              <n-image
                v-if="img.src && changeSpareUrl===true"
                :src="img.spareUrl"
                class="postCardImg"
                width="120"
              />
              <div v-if="img.desc" class="postCardImageDesc">
                <span>{{ img.desc }}</span>
              </div>
            </div>
          </div>
          <div v-if="block.type === 'text'" class="postCardText">
            <RichTextRenderer :tokens="parseRichText(block.content)" />
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
  border-radius: 1.5em;
  background-color: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  max-height: 84.4dvh;
}

.n-card__content {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.postCardImg img {
  margin: 1em;
}

$card-bg: rgba(255, 255, 255, 0.3);
$text-color: #191919;
$border-radius: 16px;
$transition-speed: 0.3s;

.postCardImage {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.5rem;
  margin: 1rem 0;

  .postCardNImage {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: fit-content;
    justify-content: center;
    align-content: center;

    .postCardImg img {
      margin: 0 !important;
      border-radius: 8px;
    }
  }

  .postCardImageDesc {
    margin-top: 0.5rem;

    span {
      font-size: 0.9rem;
      color: color.adjust($text-color, $lightness: 80%);
      text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.9);
      text-align: center;
      display: block;
      word-break: break-all;
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
      gap: 0.5rem;
      font-size: 0.92rem;
      color: color.adjust($text-color, $lightness: 90%);
      margin-bottom: 0.5rem;
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
  background: $card-bg;
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: $border-radius;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  padding: 0.8rem;

  // 核心变量
  --mx: -100px;
  --my: -100px;
  --opacity: 0; // 默认光是隐藏的
  position: relative;
  overflow: hidden;
  transition: transform 0.2s, background-color 0.3s;

  @media (max-width: 900px) {
    height: 15.9rem;
  }
  @media (min-width: 900px) {
    width: 25rem;
    height: 12.3rem;
  }
  // 1. 面光 (Surface Glow) - 柔和的大范围光晕
  &::before {
    content: '';
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
      color: $text-color;
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
      font-size: 0.8rem;
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
          line-clamp: 11
        }
        @media (min-width: 900px) {
          -webkit-line-clamp: 8;
          line-clamp: 8;
        }
      }
      p {
        max-height: 100%;
        margin: 0;
        color: $text-color;
        text-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);
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
  color: $text-color;
}

.loading-state {
  text-align: center;
  padding: 4rem;
  color: $text-color;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);
  font-size: 2em;
}
</style>
