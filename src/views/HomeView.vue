<script setup lang="ts">
const assetBase = import.meta.env.BASE_URL;
const staticSite = import.meta.env.VITE_STATIC_SITE === "true";
import { defineAsyncComponent, ref } from "vue";
import BrandMark from "../components/BrandMark.vue";
import StatusBadge from "../components/StatusBadge.vue";
import DisplayControls from "../components/DisplayControls.vue";
import Icon from "../components/Icon.vue";
import HeroSection from "../components/HeroSection.vue";
import ProjectsSection from "../components/ProjectsSection.vue";
import SystemsSection from "../components/SystemsSection.vue";
import SkillsSection from "../components/SkillsSection.vue";
import CasesSection from "../components/CasesSection.vue";
import { useSiteStore } from "../stores/site";
import { useScene } from "../composables/useScene";
import { useLocale } from "../composables/useLocale";
const ChatPanel = defineAsyncComponent(
  () => import("../components/ChatPanel.vue"),
);
const site = useSiteStore(),
  { tr } = useLocale(),
  { reducedMotion } = useScene();
const chatOpen = ref(false),
  menuOpen = ref(false),
  copied = ref(false);
function openChat() {
  if (import.meta.env.VITE_STATIC_SITE === "true") {
    window.location.assign(site.state.settings.telegram);
    return;
  }
  chatOpen.value = true;
  menuOpen.value = false;
}
async function copyDiscord() {
  try {
    await navigator.clipboard.writeText(site.state.settings.discord);
    copied.value = true;
  } catch {
    copied.value = false;
  }
}
</script>
<template>
  <div
    class="public-site"
    :class="{
      'effects-light': site.state.quality === 'light',
      'effects-full': site.state.quality === 'full',
    }"
  >
    <a class="skip-link" href="#main">{{
      tr("Перейти к содержимому", "Skip to content")
    }}</a>
    <header class="site-header">
      <div class="container header-inner">
        <RouterLink to="/" :aria-label="tr('Veyl - главная', 'Veyl - home')"
          ><BrandMark
        /></RouterLink>
        <nav
          :class="{ open: menuOpen }"
          :aria-label="tr('Основная навигация', 'Main navigation')"
        >
          <a href="#skills" @click="menuOpen = false">{{
            tr("Навыки", "Skills")
          }}</a
          ><a href="#projects" @click="menuOpen = false">{{
            tr("Проекты", "Projects")
          }}</a
          ><a href="#contact" @click="menuOpen = false">{{
            tr("Контакты", "Contact")
          }}</a>
        </nav>
        <div class="header-actions">
          <StatusBadge /><DisplayControls /><button
            class="header-chat"
            v-if="site.state.settings.chatVisible"
            @click="openChat"
          >
            {{ tr("Написать", "Let’s talk") }} <Icon /></button
          ><button
            class="icon-button menu-button"
            :aria-expanded="menuOpen"
            :aria-label="tr('Открыть меню', 'Open menu')"
            @click="menuOpen = !menuOpen"
          >
            <Icon :name="menuOpen ? 'close' : 'menu'" />
          </button>
        </div>
      </div>
    </header>
    <main id="main">
      <HeroSection :reduced="reducedMotion" @chat="openChat" />
      <section id="about" class="about-section section-pad">
        <div class="container">
          <div class="about-intro" data-reveal>
            <span class="eyebrow">Minecraft / Web / Systems</span>
            <div>
              <h2>
                {{ tr("Техническая сторона", "The technical side")
                }}<br /><span>{{ tr("твоей идеи.", "of your idea.") }}</span>
              </h2>
              <p>
                {{ tr(site.state.content.about, site.state.content.aboutEn) }}
              </p>
            </div>
            <span class="about-plus" aria-hidden="true">+</span>
          </div>
          <div class="capability-grid" data-reveal>
            <article>
              <span class="capability-number">1 /</span><Icon name="cube" />
              <h3>Minecraft</h3>
              <p>
                {{
                  tr(
                    "Сеть серверов, собственные механики, настройка плагинов и оптимизация.",
                    "Server networks, custom gameplay, plugin configuration and optimization.",
                  )
                }}
              </p>
              <span class="mono">Paper · Velocity · Skript</span>
            </article>
            <article>
              <span class="capability-number">2 /</span><Icon name="code" />
              <h3>Web</h3>
              <p>
                {{
                  tr(
                    "Сайты, панели и интерфейсы. От внешнего вида до данных и управления.",
                    "Websites, panels and interfaces. From visual design to data and management.",
                  )
                }}
              </p>
              <span class="mono">Vue · TypeScript · REST API</span>
            </article>
            <article>
              <span class="capability-number">3 /</span><Icon name="grid" />
              <h3>Systems</h3>
              <p>
                {{
                  tr(
                    "Боты, базы, роли и интеграции. Разные сервисы с общей логикой.",
                    "Bots, databases, roles and integrations. Different services with shared logic.",
                  )
                }}
              </p>
              <span class="mono">Discord API · Database · Automation</span>
            </article>
          </div>
        </div>
      </section>
      <SkillsSection /><CasesSection /><ProjectsSection /><SystemsSection />
      <section id="contact" class="contact-section">
        <div class="container contact-layout" data-reveal>
          <div>
            <h2>
              {{ tr("Есть идея?", "Got an idea?") }}<br /><span>{{
                tr("Напиши.", "Let’s talk.")
              }}</span>
            </h2>
            <p>
              {{
                tr(
                  "Расскажи, что нужно создать или исправить.",
                  "Tell me what you want to build or fix.",
                )
              }}
            </p>
            <button
              v-if="site.state.settings.chatVisible"
              class="button primary"
              @click="openChat"
            >
              {{ staticSite ? "Telegram" : "Veyl / Chat" }} <Icon />
            </button>
            <div class="contact-links">
              <a
                v-if="site.state.settings.telegram"
                :href="site.state.settings.telegram"
                target="_blank"
                rel="noopener noreferrer"
                >Telegram <Icon /></a
              ><button v-if="site.state.settings.discord" @click="copyDiscord">
                Discord / {{ site.state.settings.discord }}
                <span>{{
                  copied ? tr("Скопировано", "Copied") : "↗"
                }}</span></button
              ><a
                v-if="site.state.settings.github"
                :href="site.state.settings.github"
                target="_blank"
                rel="noopener noreferrer"
                >GitHub <Icon
              /></a>
            </div>
          </div>
          <div class="contact-status">
            <img
              class="contact-emblem"
              :src="`${assetBase}assets/emblem.webp`"
              width="960"
              height="960"
              alt="Veyl"
              loading="lazy"
            /><StatusBadge />
            <p v-if="site.state.settings.statusVisible">
              {{
                tr(
                  site.activeStatus.description,
                  site.activeStatus.descriptionEn,
                )
              }}
            </p>
            <p
              v-if="site.state.settings.statusVisible && site.state.statusUntil"
            >
              {{ tr("До", "Until") }}
              {{
                new Date(site.state.statusUntil).toLocaleString(
                  site.state.language === "ru" ? "ru-RU" : "en-GB",
                  { dateStyle: "medium", timeStyle: "short" },
                )
              }}
            </p>
          </div>
        </div>
      </section>
    </main>
    <footer class="site-footer">
      <div class="container footer-inner">
        <BrandMark /><span>Minecraft / Web / Systems</span>
        <div>
          <button
            @click="
              site.state.quality =
                site.state.quality === 'light' ? 'balanced' : 'light'
            "
          >
            {{
              site.state.quality === "light"
                ? tr("Включить эффекты", "Enable effects")
                : tr("Меньше эффектов", "Reduce effects")
            }}</button
          ><span>© 2026 Veyl</span>
        </div>
      </div>
    </footer>
    <button
      v-if="site.state.settings.chatVisible"
      class="floating-chat"
      :aria-label="
        staticSite
          ? tr('Написать в Telegram', 'Message on Telegram')
          : tr('Открыть Veyl / Chat', 'Open Veyl / Chat')
      "
      @click="openChat"
    >
      <Icon name="chat" /><span>{{
        staticSite ? "Telegram" : "Veyl / Chat"
      }}</span>
    </button>
    <ChatPanel v-if="chatOpen" @close="chatOpen = false" />
  </div>
</template>
