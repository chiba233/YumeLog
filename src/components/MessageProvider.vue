<script setup>
import { useMessage } from "naive-ui";
import { setGlobalMessage } from "@/components/ts/msgUtils.ts";

setGlobalMessage(useMessage());
</script>

<template>
  <slot />
</template>