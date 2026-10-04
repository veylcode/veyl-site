<script setup lang="ts">
const assetBase = import.meta.env.BASE_URL;
import SceneBackground from "./SceneBackground.vue";
import Icon from "./Icon.vue";
import { useSiteStore } from "../stores/site";
import { onMounted, onUnmounted, ref } from "vue";
import { useLocale } from "../composables/useLocale";
import { useHeroMotion } from "../composables/useHeroMotion";
const props = defineProps<{ reduced: boolean }>();
defineEmits<{ chat: [] }>();
const site = useSiteStore();
const { tr } = useLocale();
const section = ref<HTMLElement>();
useHeroMotion(section, () => props.reduced);
const paused = ref(false);
let observer: IntersectionObserver | undefined;
let inView = true;
const updateVisibility = () => {
  paused.value = document.hidden || !inView;
};
onMounted(() => {
  observer = new IntersectionObserver(([entry]) => {
    inView = entry?.isIntersecting ?? false;
    updateVisibility();
  });
  if (section.value) observer.observe(section.value);
  document.addEventListener("visibilitychange", updateVisibility);
});
onUnmounted(() => {
  observer?.disconnect();
  document.removeEventListener("visibilitychange", updateVisibility);
});
</script>
<template>
  <section
    ref="section"
    class="hero"
    :class="{
      'light-motion': reduced || site.state.quality === 'light',
      'motion-paused': paused,
    }"
  >
    <SceneBackground :reduced="reduced" />
    <div class="hero-content container">
      <div class="hero-copy">
        <h1>Veyl<span>.</span></h1>
        <div class="hero-domains">
          Minecraft <span>/</span> Web <span>/</span> Systems
        </div>
        <h2>{{ tr(site.state.content.title, site.state.content.titleEn) }}</h2>
        <p>
          {{ tr(site.state.content.subtitle, site.state.content.subtitleEn) }}
        </p>
        <div class="hero-actions">
          <a class="button primary" href="#projects"
            >{{ tr("Посмотреть проекты", "View projects") }} <Icon /></a
          ><button
            v-if="site.state.settings.chatVisible"
            class="button text-button"
            @click="$emit('chat')"
          >
            {{
              tr(
                site.state.settings.chatButtonRu,
                site.state.settings.chatButtonEn,
              )
            }}
            <Icon name="chat" />
          </button>
        </div>
        <div class="hero-caption">
          <span class="mini-square"></span> Paper / Velocity / Vue / Discord API
        </div>
      </div>
      <div class="hero-art" aria-label="Ледяной фирменный знак Veyl">
        <div class="ice-field" aria-hidden="true">
          <div
            v-for="index in 6"
            :key="index"
            class="ice-shard"
            :class="`shard-${index}`"
          >
            <i></i>
          </div>
          <div class="orbit-trace trace-one"></div>
          <div class="orbit-trace trace-two"></div>
          <div class="scene-sweep"></div>
        </div>
        <div class="orbit orbit-outer"></div>
        <div class="orbit orbit-inner"></div>
        <span class="art-coordinate">V / CORE <span>1.0</span></span>
        <img
          :src="`${assetBase}assets/emblem.webp`"
          width="960"
          height="960"
          alt="Veyl - ледяной V-знак"
          fetchpriority="high"
          class="hero-emblem"
        />
        <span class="art-tag tag-top"><i></i> Minecraft</span
        ><span class="art-tag tag-right"><i></i> Web</span
        ><span class="art-tag tag-bottom"><i></i> Systems</span>
        <span class="art-spark spark-one">+</span
        ><span class="art-spark spark-two">+</span>
        <div class="art-baseline">
          <span>Veyl / Minecraft · Web · Systems</span><span>↗</span>
        </div>
      </div>
    </div>
    <div class="hero-bottom container">
      <a href="#about"
        ><span class="scroll-icon">↓</span>
        {{ tr("Листай дальше", "Scroll to explore") }}</a
      ><span>{{
        tr("Идея → код → работающий проект", "Idea → code → working project")
      }}</span
      ><span class="mono">Veyl / 2026</span>
    </div>
  </section>
</template>
