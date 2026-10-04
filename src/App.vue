<script setup lang="ts">
import { onMounted } from "vue";
import { useSiteStore } from "./stores/site";
const site = useSiteStore();
onMounted(() => site.connectPublic());
</script>
<template><RouterView /></template>
