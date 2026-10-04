<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useSiteStore } from "../stores/site";
const site = useSiteStore();
const visible = ref(true);
const props = defineProps<{ reduced: boolean }>();
const active = computed(
  () => visible.value && !props.reduced && site.state.quality !== "light",
);
const particles = Array.from({ length: 14 }, (_, i) => ({
  x: (i * 31 + 13) % 97,
  y: (i * 19 + 7) % 91,
  delay: `${-i * 0.8}s`,
  size: i % 3 === 0 ? "7px" : "3px",
}));
const visibility = () => {
  visible.value = !document.hidden;
};
onMounted(() => document.addEventListener("visibilitychange", visibility));
onUnmounted(() => document.removeEventListener("visibilitychange", visibility));
</script>
<template>
  <div
    class="scene-background"
    :class="{ 'scene-paused': !active }"
    aria-hidden="true"
  >
    <div class="scene-grid"></div>
    <div class="scene-glow"></div>
    <div class="scene-axis axis-one"></div>
    <div class="scene-axis axis-two"></div>
    <span
      v-for="(particle, i) in particles"
      :key="i"
      class="particle"
      :style="{
        left: `${particle.x}%`,
        top: `${particle.y}%`,
        animationDelay: particle.delay,
        width: particle.size,
        height: particle.size,
      }"
    ></span>
  </div>
</template>
