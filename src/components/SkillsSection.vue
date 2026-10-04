<script setup lang="ts">
import { computed, ref } from "vue";
import portfolio from "../data/portfolio.json" with { type: "json" };
import { useLocale } from "../composables/useLocale";
import Icon from "./Icon.vue";
const { tr } = useLocale();
const search = ref(""),
  expanded = ref<string | null>("PLUGINS / CORE");
const explanations = [
  "Minecraft network cores, proxies and server environments.",
  "Plugins I have installed, connected and configured.",
  "RTP, cases, rewards, promo codes and custom gameplay logic.",
  "Player profiles, roles, voice chat, events and moderation.",
  "Languages and frameworks used in server and web projects.",
  "Connecting Minecraft, Discord and internal project services.",
  "Data storage, configuration, migrations and backups.",
  "Server mods, resources and custom game behavior.",
  "Building, testing, publishing and investigating issues.",
  "Plugins, modules and tools I have created or extended.",
];
const translations: Record<string, string> = {
  Промокоды: "Promo codes",
  "Кейсы и токены": "Cases & tokens",
  "GUI-меню": "GUI menus",
  "Экономика и магазины": "Economy & shops",
  "RTP по структурам": "Structure RTP",
  "Профили игроков": "Player profiles",
  Роли: "Roles",
  Чат: "Chat",
  Поселения: "Settlements",
  События: "Events",
  Квесты: "Quests",
  Модерация: "Moderation",
  Верификация: "Verification",
  "Синхронизация ролей": "Role sync",
  Тикеты: "Tickets",
  Уведомления: "Notifications",
  "Чат-логи": "Chat logs",
  "Конфиги плагинов": "Plugin configs",
  "Резервные копии": "Backups",
};
const groups = computed(() =>
  portfolio.groups
    .map((group, index) => ({
      ...group,
      descriptionEn: explanations[index],
      itemsEn: group.items.map((item) => translations[item] || item),
    }))
    .filter((group) =>
      `${group.title} ${group.titleEn} ${group.items.join(" ")}`
        .toLowerCase()
        .includes(search.value.toLowerCase()),
    ),
);
const total = portfolio.groups.reduce(
  (sum, group) => sum + group.items.length,
  0,
);
</script>
<template>
  <section id="skills" class="skills-section section-pad">
    <div class="container">
      <div class="section-heading" data-reveal>
        <div>
          <h2>{{ tr("С чем работаю.", "What I work with.") }}</h2>
          <p>
            {{
              tr(
                "Не только плагины. Вся техническая часть проекта.",
                "Beyond plugins. The entire technical side of a project.",
              )
            }}
          </p>
        </div>
        <div class="skills-search">
          <label class="sr-only" for="skill-search">{{
            tr("Найти технологию", "Find a technology")
          }}</label
          ><input
            id="skill-search"
            v-model="search"
            :placeholder="
              tr('Плагин, язык, инструмент…', 'Plugin, language, tool…')
            "
          /><span>{{ total }} {{ tr("инструментов", "tools") }}</span>
        </div>
      </div>
      <div class="skill-groups">
        <article v-for="group in groups" :key="group.code" class="skill-group">
          <button
            class="skill-group-title"
            :aria-expanded="!!search || expanded === group.code"
            @click="expanded = expanded === group.code ? null : group.code"
          >
            <h3>{{ tr(group.title, group.titleEn) }}</h3>
            <span>{{ group.items.length }}</span
            ><Icon
              :name="expanded === group.code || search ? 'close' : 'arrow'"
            />
          </button>
          <div
            v-if="search || expanded === group.code"
            class="skill-group-body"
          >
            <p>{{ tr(group.description, group.descriptionEn || "") }}</p>
            <div class="skill-tags">
              <span
                v-for="(item, index) in group.items"
                :key="item"
                :style="{ '--stagger': `${index * 15}ms` }"
                >{{ tr(item, group.itemsEn[index] || item) }}</span
              >
            </div>
          </div>
        </article>
        <p v-if="!groups.length" class="empty-state">
          {{
            tr(
              "Не нашлось. Попробуй другое название.",
              "No matches. Try another name.",
            )
          }}
        </p>
      </div>
      <p class="skill-footnote">
        {{
          tr(
            "Java - базовый уровень. Конкретный объём разработки обсуждаю перед началом задачи.",
            "Java - basic level. I agree on the scope of development before starting a task.",
          )
        }}
      </p>
    </div>
  </section>
</template>
