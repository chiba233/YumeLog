<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef } from "vue";
import { parseRichText } from "@/components/ts/dsl/semantic/blogFormat.ts";
import type { PostBlock, TextToken } from "./ts/d";

interface Props {
  block?: PostBlock;
  ssr?: boolean;
}

const props = defineProps<Props>();

const isVisible = ref(false);
const container = ref<HTMLElement | null>(null);
const isParsed = ref(false);
let observer: IntersectionObserver | null = null;

const getInitialTokens = (): TextToken[] => {
  if (Array.isArray(props.block?.tokens) && props.block.tokens.length > 0) {
    isParsed.value = true;
    return props.block.tokens;
  }

  if (props.ssr && props.block?.type === "text" && typeof props.block.content === "string") {
    try {
      const tokens = parseRichText(props.block.content);
      isParsed.value = true;
      return tokens;
    } catch {
      return [];
    }
  }
  return [];
};

const localTokens = shallowRef<TextToken[]>(getInitialTokens());

const shouldLazy = computed(() => {
  if (props.ssr) return false;
  return !isParsed.value;
});

const shouldRenderContent = computed(() => {
  return !shouldLazy.value || isVisible.value;
});

onMounted(async () => {
  await nextTick();
  if (!props.block || !container.value) return;
  if (!shouldLazy.value) {
    isVisible.value = true;
    return;
  }

  const scrollRoot =
    container.value.closest(".n-card__content") ||
    container.value.closest(".n-scrollbar-container");

  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        if (
          !isParsed.value &&
          props.block?.type === "text" &&
          typeof props.block.content === "string"
        ) {
          try {
            localTokens.value = parseRichText(props.block.content);
            isParsed.value = true;
          } catch (e) {
            console.error("Lazy Parse Error:", e);
          }
        }
        isVisible.value = true;
        stopObserving();
      }
    },
    {
      root: scrollRoot as HTMLElement | null,
      rootMargin: "300px",
    },
  );
  observer.observe(container.value);
});

const stopObserving = () => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
};
onUnmounted(() => {
  stopObserving();
  localTokens.value = [];
  container.value = null;
});
</script>

<template>
  <div ref="container" :class="{ 'is-loaded': shouldRenderContent }" class="lazy-block-wrapper">
    <slot v-if="shouldRenderContent" :combined-tokens="localTokens" />
    <div v-else class="lazy-placeholder">
      <div class="skeleton-glow"></div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.lazy-block-wrapper {
  content-visibility: auto;
  contain-intrinsic-size: 1px 300px;
  width: 100%;
  margin-bottom: 1.2rem;
  min-height: 20px;
  transition: opacity 0.5s ease;
}

.is-loaded {
  content-visibility: visible;
}

.lazy-placeholder {
  height: 300px;
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
