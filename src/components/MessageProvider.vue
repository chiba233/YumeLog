<script setup>
import { useMessage } from "naive-ui";
import { setGlobalMessage } from "@/components/ts/global/msgUtils.ts";

setGlobalMessage(useMessage());
</script>

<template>
  <slot />
</template>
