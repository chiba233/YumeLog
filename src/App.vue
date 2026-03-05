<script lang="ts" setup>
import { RouterView } from "vue-router";
import MessageProvider from "@/components/MessageProvider.vue";
import { NMessageProvider } from "naive-ui";
</script>

<template>
  <n-message-provider>
    <MessageProvider>
      <RouterView />
    </MessageProvider>
  </n-message-provider>
</template>

<style scoped></style>
