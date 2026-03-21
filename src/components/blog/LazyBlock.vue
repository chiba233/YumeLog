<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from "vue";
import {
  getCachedBlockTokens,
  setCachedBlockTokens,
} from "@/components/ts/dsl/BlogRichText/blockTokenCache.ts";
import { parseRichText } from "@/components/ts/dsl/BlogRichText/blogFormat.ts";
import type { TextToken } from "../ts/dsl/BlogRichText/types";
import type { PostBlock } from "../ts/d.ts";

interface Props {
  block?: PostBlock;
  ssr?: boolean;
}

const props = defineProps<Props>();

const container = ref<HTMLElement | null>(null);
const isParsed = ref(false);
const localTokens = shallowRef<TextToken[]>([]);
let observer: IntersectionObserver | null = null;

const shouldLazy = computed(() => {
  return !props.ssr && !isParsed.value;
});

const shouldRenderContent = computed(() => {
  return props.ssr || isParsed.value;
});

const getBlockTextContent = (block?: PostBlock): string | null => {
  if (!block || block.type !== "text" || typeof block.content !== "string") {
    return null;
  }

  return block.content;
};

const getBlockCachedTokens = (block?: PostBlock): TextToken[] => {
  return getCachedBlockTokens(block?.temp_id) ?? [];
};

const stopObserving = () => {
  observer?.disconnect();
  observer = null;
};

const resolveInitialState = (): { tokens: TextToken[]; parsed: boolean } => {
  const cachedTokens = getBlockCachedTokens(props.block);
  if (cachedTokens.length > 0) {
    return {
      tokens: cachedTokens,
      parsed: true,
    };
  }

  if (Array.isArray(props.block?.tokens) && props.block.tokens.length > 0) {
    return {
      tokens: props.block.tokens,
      parsed: true,
    };
  }

  if (!props.ssr) {
    return {
      tokens: [],
      parsed: false,
    };
  }

  const content = getBlockTextContent(props.block);
  if (!content) {
    return {
      tokens: [],
      parsed: false,
    };
  }

  try {
    const tokens = parseRichText(content);
    if (props.block?.temp_id) {
      setCachedBlockTokens(props.block.temp_id, tokens);
    }

    return {
      tokens,
      parsed: true,
    };
  } catch (e) {
    console.error("SSR Parse Error:", e);
    return {
      tokens: [],
      parsed: false,
    };
  }
};
const parseBlock = () => {
  if (isParsed.value) return;

  const content = getBlockTextContent(props.block);
  if (!content) {
    localTokens.value = [];
    isParsed.value = false;
    return;
  }

  try {
    const cachedTokens = getBlockCachedTokens(props.block);
    if (cachedTokens.length > 0) {
      localTokens.value = cachedTokens;
      isParsed.value = true;
      return;
    }

    const tokens = parseRichText(content);
    localTokens.value = tokens;
    if (props.block?.temp_id) {
      setCachedBlockTokens(props.block.temp_id, tokens);
    }
    isParsed.value = true;
  } catch (e) {
    console.error("Lazy Parse Error:", e);
    localTokens.value = [];
    isParsed.value = false;
  }
};

const resetState = () => {
  stopObserving();
  const { tokens, parsed } = resolveInitialState();
  localTokens.value = tokens;
  isParsed.value = parsed;
};

const estimatedHeight = computed(() => {
  const content =
    props.block?.type === "text" && typeof props.block.content === "string"
      ? props.block.content
      : "";

  const len = content.length;

  if (len < 80) return 72;
  if (len < 200) return 120;
  if (len < 400) return 160;
  if (len < 800) return 200;
  return 240;
});
const setupObserver = () => {
  stopObserving();

  if (!container.value || !shouldLazy.value) return;

  const scrollRoot = container.value.closest(".n-scrollbar-container, .n-card__content");

  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      parseBlock();
      stopObserving();
    },
    {
      root: scrollRoot instanceof HTMLElement ? scrollRoot : null,
      rootMargin: "160px 0px",
      threshold: 0.01,
    },
  );

  observer.observe(container.value);
};

const refresh = async () => {
  resetState();
  await nextTick();
  setupObserver();
};

onMounted(refresh);

watch(() => [props.block, props.ssr], refresh, { deep: false });

onUnmounted(() => {
  stopObserving();
  localTokens.value = [];
  container.value = null;
});
</script>

<template>
  <div
    ref="container"
    class="lazy-block-wrapper"
    :style="{ '--lazy-height': `${estimatedHeight}px` }"
  >
    <slot v-if="shouldRenderContent" :combined-tokens="localTokens" />
    <div v-else class="lazy-placeholder">
      <div class="skeleton-glow"></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.lazy-block-wrapper {
  contain-intrinsic-size: 1px var(--lazy-height);
  width: 100%;
  min-height: 20px;
  transition: opacity 0.5s ease;
}

.lazy-placeholder {
  height: var(--lazy-height);
  background: rgba(var(--global-theme-rgb-deep), 0.05);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(251, 238, 241, 0.1);
}

.skeleton-glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 25%,
    rgba(251, 238, 241, 0.3) 50%,
    transparent 75%
  );
  background-size: 200% 100%;
  animation: glow 2s infinite linear;
}

@keyframes glow {
  from {
    background-position: 150% 0;
  }
  to {
    background-position: -50% 0;
  }
}

:deep(.postCardText) {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
