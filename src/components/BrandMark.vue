<script setup lang="ts">
defineProps<{ compact?: boolean }>();
</script>
<template>
  <span class="brand"
    ><svg viewBox="0 0 42 40" aria-hidden="true">
      <path d="m1 3 20 35L41 3 28 11l-7 13-7-13Z" fill="currentColor" />
      <path d="m9 2 12 16L33 2l-12 7Z" fill="currentColor" opacity=".5" /></svg
    ><span v-if="!compact">Veyl<span class="brand-dot">.</span></span></span
  >
</template>
