<script setup lang="ts">
import { ref } from "vue";
import { useSiteStore } from "../stores/site";
import { useLocale } from "../composables/useLocale";
import { api } from "../lib/api";
import type { Project, ProjectCategory } from "../types";
import Icon from "./Icon.vue";
const site = useSiteStore(),
  { tr } = useLocale();
const editing = ref<string | null>(null),
  form = ref<Project | null>(null),
  notice = ref(""),
  deleting = ref<string | null>(null),
  uploadError = ref("");
const categories: ProjectCategory[] = ["Minecraft", "Web", "Systems"];
function edit(project: Project) {
  editing.value = project.id;
  form.value = { ...project };
  notice.value = "";
  uploadError.value = "";
}
function create() {
  editing.value = "new";
  form.value = {
    id: crypto.randomUUID(),
    name: "",
    category: "Minecraft",
    description: "",
    descriptionEn: "",
    stack: "",
    visible: true,
    state: "draft",
    link: "",
    cover: "",
  };
  notice.value = "";
}
async function persist() {
  try {
    await site.saveSite();
    notice.value = tr("Сохранено на сервере.", "Saved on server.");
    return true;
  } catch {
    return false;
  }
}
async function save() {
  if (!form.value?.name.trim()) return;
  const project = { ...form.value, name: form.value.name.trim() };
  if (editing.value === "new") site.state.projects.push(project);
  else {
    const index = site.state.projects.findIndex((p) => p.id === editing.value);
    if (index !== -1) site.state.projects[index] = project;
  }
  if (await persist()) {
    form.value = null;
    editing.value = null;
  }
}
async function move(index: number, direction: number) {
  const target = index + direction;
  if (target < 0 || target >= site.state.projects.length) return;
  const [item] = site.state.projects.splice(index, 1);
  if (item) site.state.projects.splice(target, 0, item);
  await persist();
}
async function toggle(project: Project) {
  project.visible = !project.visible;
  await persist();
}
async function remove(id: string) {
  site.state.projects = site.state.projects.filter(
    (project) => project.id !== id,
  );
  if (await persist()) deleting.value = null;
}
async function upload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !form.value) return;
  if (file.size > 1_400_000) {
    uploadError.value = tr(
      "Максимум 1,4 МБ. Используй WebP.",
      "Maximum 1.4 MB. Use WebP.",
    );
    return;
  }
  const content = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  try {
    const response = await api<{ url: string }>("/api/admin/cover", "POST", {
      content,
    });
    form.value.cover = response.url;
    uploadError.value = "";
  } catch (error) {
    uploadError.value =
      error instanceof Error ? error.message : "Upload failed";
  }
}
</script>
<template>
  <div class="admin-section-title">
    <div>
      <h2>{{ tr("Мои проекты", "My projects") }}</h2>
      <p>
        {{
          tr(
            "Описания, ссылки, обложки и порядок на сайте.",
            "Descriptions, links, covers and display order.",
          )
        }}
      </p>
    </div>
    <button class="button primary" @click="create">
      {{ tr("Добавить проект", "Add project") }} +
    </button>
  </div>
  <p v-if="notice" class="save-notice" role="status">{{ notice }}</p>
  <form v-if="form" class="admin-card editor-form" @submit.prevent="save">
    <h3>
      {{
        editing === "new"
          ? tr("Новый проект", "New project")
          : tr("Редактирование проекта", "Edit project")
      }}
    </h3>
    <label
      >{{ tr("Название", "Name")
      }}<input v-model="form.name" required maxlength="80"
    /></label>
    <div class="form-columns">
      <label
        >{{ tr("Направление", "Category")
        }}<select v-model="form.category">
          <option v-for="category in categories" :key="category">
            {{ category }}
          </option>
        </select></label
      ><label
        >{{ tr("Состояние", "State")
        }}<select v-model="form.state">
          <option value="active">{{ tr("В работе", "In progress") }}</option>
          <option value="completed">{{ tr("Завершён", "Completed") }}</option>
          <option value="archived">
            {{ tr("Проект закрыт", "Project closed") }}
          </option>
          <option value="unknown">
            {{ tr("Моё участие завершено", "My involvement has ended") }}
          </option>
          <option value="draft">{{ tr("Черновик", "Draft") }}</option>
          <option value="private">{{ tr("Приватный", "Private") }}</option>
        </select></label
      >
    </div>
    <label
      >{{ tr("Технологии", "Technologies")
      }}<input v-model="form.stack" maxlength="300"
    /></label>
    <div class="form-columns">
      <label
        >{{ tr("Описание / RU", "Description / RU")
        }}<textarea
          v-model="form.description"
          rows="4"
          maxlength="1500"
        ></textarea></label
      ><label
        >Description / EN<textarea
          v-model="form.descriptionEn"
          rows="4"
          maxlength="1500"
        ></textarea>
      </label>
    </div>
    <div class="form-columns">
      <label
        >{{ tr("Роль / RU", "Role / RU")
        }}<input v-model="form.role" maxlength="100" /></label
      ><label>Role / EN<input v-model="form.roleEn" maxlength="100" /></label>
    </div>
    <label
      >{{ tr("Ссылка", "Link") }}<input v-model="form.link" type="url" /></label
    ><label
      >{{
        tr(
          "Обложка / PNG, JPEG, WebP до 1,4 МБ",
          "Cover / PNG, JPEG, WebP up to 1.4 MB",
        )
      }}<input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        @change="upload"
    /></label>
    <p v-if="uploadError" class="form-error">{{ uploadError }}</p>
    <img
      v-if="form.cover"
      class="cover-preview"
      :src="form.cover"
      alt="Cover preview"
    /><label class="checkbox-label"
      ><input v-model="form.visible" type="checkbox" />{{
        tr("Показывать на сайте", "Show on website")
      }}</label
    ><label class="checkbox-label"
      ><input v-model="form.alias" type="checkbox" />{{
        tr("Публичное название изменено", "Public name has been changed")
      }}</label
    >
    <div class="form-actions">
      <button class="button primary" :disabled="site.saving">
        {{ tr("Сохранить", "Save") }}</button
      ><button type="button" class="button secondary" @click="form = null">
        {{ tr("Отмена", "Cancel") }}
      </button>
    </div>
  </form>
  <div class="admin-card admin-projects">
    <article v-for="(project, index) in site.state.projects" :key="project.id">
      <div class="project-admin-icon">
        <Icon :name="project.category === 'Minecraft' ? 'cube' : 'code'" />
      </div>
      <div class="project-admin-copy">
        <h3>{{ project.name }}</h3>
        <p>{{ project.category }} / {{ project.stack }}</p>
      </div>
      <button
        class="visibility-toggle"
        :class="{ visible: project.visible }"
        :aria-pressed="project.visible"
        @click="toggle(project)"
      >
        {{ project.visible ? tr("Виден", "Visible") : tr("Скрыт", "Hidden") }}
      </button>
      <div class="project-order">
        <button
          :disabled="index === 0"
          :aria-label="tr(`Поднять ${project.name}`, `Move ${project.name} up`)"
          @click="move(index, -1)"
        >
          ↑</button
        ><button
          :disabled="index === site.state.projects.length - 1"
          :aria-label="
            tr(`Опустить ${project.name}`, `Move ${project.name} down`)
          "
          @click="move(index, 1)"
        >
          ↓
        </button>
      </div>
      <button class="small-button" @click="edit(project)">
        {{ tr("Изменить", "Edit") }}</button
      ><button
        class="icon-button delete-button"
        :aria-label="tr(`Удалить ${project.name}`, `Delete ${project.name}`)"
        @click="deleting = project.id"
      >
        <Icon name="close" />
      </button>
      <div v-if="deleting === project.id" class="delete-confirm">
        <span>{{ tr("Удалить проект?", "Delete project?") }}</span
        ><button @click="remove(project.id)">
          {{ tr("Удалить", "Delete") }}</button
        ><button @click="deleting = null">{{ tr("Отмена", "Cancel") }}</button>
      </div>
    </article>
    <p v-if="!site.state.projects.length" class="empty-state">
      {{ tr("Добавь первый проект.", "Add your first project.") }}
    </p>
  </div>
</template>
