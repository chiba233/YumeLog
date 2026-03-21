<script lang="ts" setup>
import { onMounted, ref } from "vue";

const show = ref(false);
onMounted(() => {
  show.value = true;
});
</script>

<template>
  <slot v-if="show" />
</template>
