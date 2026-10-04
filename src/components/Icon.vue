<script setup lang="ts">
defineProps<{ name?: string }>();
</script>
<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    aria-hidden="true"
  >
    <template v-if="name === 'sun'">
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"
      />
    </template>
    <template v-else-if="name === 'moon'">
      <path d="M20 15a9 9 0 0 1-11-11 9 9 0 1 0 11 11Z" />
    </template>
    <template v-else-if="name === 'chat'">
      <path d="M20 11.5a8 8 0 0 1-8 8H4l-2 2V11.5a9 9 0 0 1 18 0Z" />
      <path d="M7 10h8M7 14h5" />
    </template>
    <template v-else-if="name === 'grid'">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </template>
    <template v-else-if="name === 'cube'">
      <path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10L3 7m9 5 9-5m-9 5v10" />
    </template>
    <template v-else-if="name === 'code'">
      <path d="m8 5-6 7 6 7m8-14 6 7-6 7m-3-16-2 18" />
    </template>
    <template v-else-if="name === 'settings'">
      <path d="M4 7h16M4 17h16" />
      <circle cx="9" cy="7" r="3" fill="var(--panel,#fff)" />
      <circle cx="15" cy="17" r="3" fill="var(--panel,#fff)" />
    </template>
    <template v-else-if="name === 'close'">
      <path d="m6 6 12 12M6 18 18 6" />
    </template>
    <template v-else-if="name === 'check'">
      <path d="m5 12 4 4L19 6" />
    </template>
    <template v-else-if="name === 'menu'">
      <path d="M3 7h18M3 17h18" />
    </template>
    <template v-else><path d="M5 19 19 5M5 5h14v14" /></template>
  </svg>
</template>
