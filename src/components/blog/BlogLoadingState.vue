<script lang="ts" setup>
import { NAlert } from "naive-ui";
import { processedPosts } from "@/components/ts/global/useGlobalState.ts";

defineProps<{
  yamlLoading: boolean;
  processedPostsLength: number;
  serverError: boolean;
  notFoundError: boolean;
  yamlRetrying: boolean;
  listSpareError: boolean;
  faultTimes: number;
  lang: string;
  blogDisplay: Record<string, string>;
}>();
</script>
<template>
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
</template>

<style lang="scss">
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