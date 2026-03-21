<script lang="ts" setup>
import { NButton, NCard, NIcon, NModal } from "naive-ui";
import Cancel from "@/icons/cancel.svg";
import { lang } from "@/components/ts/global/setupLang.ts";
import type { Directive, VNodeChild } from "vue";
import type { ProcessedPost } from "../ts/d.ts";

defineProps<{
  show: boolean;
  selectedPost: ProcessedPost | null;
  isHydrated: boolean;
  vA11y: Directive;
  renderDetailContent: () => VNodeChild;
  onMove: (e: MouseEvent) => void;
  onLeave: (e: MouseEvent) => void;
  onEnter: (e: MouseEvent) => void;
  handleModalFinishedLeaving: () => void;
  closePortal: () => void | Promise<void>;
}>();

const emit = defineEmits<{
  "update:show": [value: boolean];
}>();
</script>

<template>
  <n-modal
    :on-after-leave="handleModalFinishedLeaving"
    :show="show"
    to="#modal-target"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @mousemove="onMove"
    @update:show="emit('update:show', $event)"
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
.postCardTitle {
  padding: 0;
  font-size: 1.2rem;
  margin: 0;
  font-weight: bold;
}
.postModel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 99dvh !important;
  max-width: 99%;
  --mx: -100px;
  --my: -100px;
  --opacity: 0;
  position: relative;
  transition:
    transform 0.2s,
    background-color 0.3s;
  :deep(.n-card-header) {
    flex-shrink: 0;
  }
  @media (min-width: 1050px) {
    max-width: 75em !important;
  }
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
    z-index: 2;
    opacity: var(--opacity);
    transition: opacity 0.4s ease;
    pointer-events: none;
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
  }
}
</style>
