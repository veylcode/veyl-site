<script setup lang="ts">
import { useSiteStore } from "../stores/site";
import { useLocale } from "../composables/useLocale";
import Icon from "./Icon.vue";
import { ref, onMounted, onUnmounted } from "vue";
const open = ref(false),
  controls = ref<HTMLElement>();
function outside(event: PointerEvent) {
  if (!controls.value?.contains(event.target as Node)) open.value = false;
}
function escape(event: KeyboardEvent) {
  if (event.key === "Escape") open.value = false;
}
onMounted(() => {
  document.addEventListener("pointerdown", outside);
  document.addEventListener("keydown", escape);
});
onUnmounted(() => {
  document.removeEventListener("pointerdown", outside);
  document.removeEventListener("keydown", escape);
});
const site = useSiteStore(),
  { tr } = useLocale();
</script>
<template>
  <div ref="controls" class="display-controls">
    <button
      class="theme-toggle"
      :aria-label="
        site.state.theme === 'dark'
          ? tr('Включить светлую тему', 'Switch to light theme')
          : tr('Включить тёмную тему', 'Switch to dark theme')
      "
      @click="site.state.theme = site.state.theme === 'dark' ? 'light' : 'dark'"
    >
      <Icon :name="site.state.theme === 'dark' ? 'sun' : 'moon'" /></button
    ><button
      class="language-toggle"
      :aria-label="tr('Switch to English', 'Переключить на русский')"
      @click="site.state.language = site.state.language === 'ru' ? 'en' : 'ru'"
    >
      {{ site.state.language.toUpperCase() }}
    </button>
    <button
      class="effects-toggle"
      :aria-label="tr('Настройки оформления', 'Display settings')"
      :aria-expanded="open"
      @click="open = !open"
    >
      <Icon name="settings" />
    </button>
    <div
      v-if="open"
      class="effects-popover"
      role="group"
      :aria-label="tr('Анимации', 'Animations')"
    >
      <strong>{{ tr("Анимации", "Animations") }}</strong
      ><label
        ><input v-model="site.state.quality" type="radio" value="full" />{{
          tr("Все эффекты", "All effects")
        }}</label
      ><label
        ><input v-model="site.state.quality" type="radio" value="balanced" />{{
          tr("Лёгкие", "Lightweight")
        }}</label
      ><label
        ><input v-model="site.state.quality" type="radio" value="light" />{{
          tr("Без анимации", "No animation")
        }}</label
      >
      <p>{{ tr("Сохраняется в этом браузере.", "Saved in this browser.") }}</p>
    </div>
  </div>
</template>
