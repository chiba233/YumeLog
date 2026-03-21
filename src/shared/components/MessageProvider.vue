<script setup>
import { useMessage } from "naive-ui";
import { setGlobalMessage } from "@/shared/lib/app/msgUtils.ts";

setGlobalMessage(useMessage());
</script>

<template>
  <slot />
</template>
