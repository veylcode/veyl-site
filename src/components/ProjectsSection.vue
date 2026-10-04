<script setup lang="ts">
import { computed, ref } from "vue";
import { useSiteStore } from "../stores/site";
import Icon from "./Icon.vue";
import type { ProjectCategory } from "../types";
import { useLocale } from "../composables/useLocale";
const site = useSiteStore();
const { tr } = useLocale();
const filter = ref<ProjectCategory | "Все">("Все");
const selected = ref<string | null>(null);
const filters: (ProjectCategory | "Все")[] = [
  "Все",
  "Minecraft",
  "Web",
  "Systems",
];
const projects = computed(() =>
  site.state.projects.filter(
    (p) =>
      p.visible &&
      !["draft", "private"].includes(p.state || "") &&
      (filter.value === "Все" || p.category === filter.value),
  ),
);
const stateLabels: Record<string, [string, string]> = {
  active: ["В разработке", "In development"],
  completed: ["Работа завершена", "Work completed"],
  archived: ["Закрыт", "Closed"],
  unknown: ["Прошлый проект", "Past project"],
};
const roles: Record<string, string> = {
  "Owner · Technical Lead": "Владелец и технический разработчик",
  "Technical Administrator": "Технический администратор",
  "Systems Administrator": "Разработка игровых систем",
  "Tech / Staff Operations": "Техническая поддержка и работа с командой",
};
</script>
<template>
  <section id="projects" class="projects-section section-pad">
    <div class="container">
      <div class="section-heading" data-reveal>
        <div>
          <h2>
            {{ tr("Мои проекты", "My projects") }}<br /><span>{{
              tr("и опыт.", "and experience.")
            }}</span>
          </h2>
        </div>
        <p>
          {{
            tr(
              "Плагины, серверы, сайты и связанные системы.",
              "Plugins, servers, websites and connected systems.",
            )
          }}
        </p>
      </div>
      <div class="featured-project" data-reveal>
        <img
          src="/assets/banner.webp"
          width="1672"
          height="941"
          loading="lazy"
          alt="Veyl / Minecraft, Web, Systems"
        />
        <div class="featured-shade"></div>
        <div class="featured-label">
          <h3>Veyl<span>.</span></h3>
          <span>Minecraft / Web / Systems</span>
        </div>
      </div>
      <div class="project-toolbar">
        <span class="mono"
          >{{ projects.length }} {{ tr("проектов", "projects") }}</span
        >
        <div
          class="filter-list"
          :aria-label="tr('Фильтр проектов', 'Project filter')"
        >
          <button
            v-for="item in filters"
            :key="item"
            :aria-pressed="filter === item"
            :class="{ active: filter === item }"
            @click="
              filter = item;
              selected = null;
            "
          >
            {{ item === "Все" ? tr("Все", "All") : item }}
          </button>
        </div>
      </div>
      <div class="project-list">
        <article
          v-for="(project, index) in projects"
          :key="project.id"
          class="project-item"
        >
          <button
            class="project-row"
            :aria-expanded="selected === project.id"
            @click="selected = selected === project.id ? null : project.id"
          >
            <span class="project-index">{{ index + 1 }}</span>
            <h3>{{ project.name }}</h3>
            <span class="project-category">{{ project.category }}</span
            ><Icon :name="selected === project.id ? 'close' : 'arrow'" />
          </button>
          <div v-if="selected === project.id" class="project-detail">
            <img
              v-if="project.cover"
              class="project-cover"
              :src="project.cover"
              :alt="project.name"
              loading="lazy"
            />
            <div class="project-meta">
              <div v-if="project.role">
                <small>{{ tr("Моя работа", "My work") }}</small
                ><span>{{
                  tr(
                    roles[project.role] || project.role,
                    project.roleEn || project.role,
                  )
                }}</span>
              </div>
              <span
                v-if="stateLabels[project.state || '']"
                class="project-state"
                :class="project.state"
                ><i></i>{{ tr(...stateLabels[project.state || ""]!) }}</span
              >
            </div>
            <p v-if="project.state === 'unknown'" class="project-lifecycle">
              {{
                tr(
                  "Я больше не поддерживаю этот проект. Актуальных сведений о том, работает ли сервер сейчас, у меня нет.",
                  "I no longer maintain this project. I do not have up-to-date information about whether the server is still running.",
                )
              }}
            </p>
            <p>
              {{
                tr(
                  project.description,
                  project.descriptionEn || project.description,
                )
              }}
            </p>
            <span class="mono">{{ project.stack }}</span>
            <a
              v-if="project.link"
              class="project-link"
              :href="project.link"
              target="_blank"
              rel="noopener noreferrer"
              >{{ tr("Открыть проект", "Open project") }} ↗</a
            >
          </div>
        </article>
        <p v-if="!projects.length" class="empty-state">
          {{
            tr(
              "В этом направлении пока нет опубликованных проектов.",
              "No published projects in this category yet.",
            )
          }}
        </p>
      </div>
      <p class="project-note">
        {{
          tr(
            "У старых проектов отдельно указано, что я делал и чем завершилось моё участие.",
            "Older projects show my work and whether my involvement has ended.",
          )
        }}
      </p>
    </div>
  </section>
</template>
