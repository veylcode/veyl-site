<script setup lang="ts">
import { ref } from "vue";
import { useSiteStore } from "../stores/site";
import { useLocale } from "../composables/useLocale";
import type { CaseStudy } from "../types";
const site = useSiteStore(),
  { tr } = useLocale(),
  draft = ref<CaseStudy | null>(null),
  notice = ref("");
const fields = [
  ["title", "titleEn", "Название", "Title"],
  ["problem", "problemEn", "Задача", "Problem"],
  ["work", "workEn", "Что сделал", "What I did"],
  ["result", "resultEn", "Результат", "Result"],
] as const;
async function persist() {
  try {
    await site.saveSite();
    notice.value = tr("Сохранено.", "Saved.");
    return true;
  } catch {
    return false;
  }
}
function add() {
  draft.value = {
    id: crypto.randomUUID(),
    title: "",
    titleEn: "",
    problem: "",
    problemEn: "",
    work: "",
    workEn: "",
    result: "",
    resultEn: "",
    stack: "",
    flow: "",
    visible: true,
    needsReview: true,
  };
}
function edit(item: CaseStudy) {
  draft.value = { ...item };
  notice.value = "";
}
async function save() {
  if (!draft.value) return;
  const index = site.state.cases.findIndex(
    (item) => item.id === draft.value!.id,
  );
  if (index < 0) site.state.cases.push({ ...draft.value });
  else site.state.cases[index] = { ...draft.value };
  if (await persist()) draft.value = null;
}
async function toggle(item: CaseStudy) {
  item.visible = !item.visible;
  await persist();
}
async function move(index: number, direction: number) {
  const next = index + direction;
  if (next < 0 || next >= site.state.cases.length) return;
  const item = site.state.cases.splice(index, 1)[0]!;
  site.state.cases.splice(next, 0, item);
  await persist();
}
async function remove() {
  if (!draft.value || !confirm(tr("Удалить эту задачу?", "Delete this case?")))
    return;
  site.state.cases = site.state.cases.filter(
    (item) => item.id !== draft.value!.id,
  );
  if (await persist()) draft.value = null;
}
</script>
<template>
  <div class="admin-section-title">
    <div>
      <h2>{{ tr("Задачи и кейсы", "Cases") }}</h2>
      <p>
        {{
          tr(
            "Описание, переводы, порядок и видимость.",
            "Descriptions, translations, order and visibility.",
          )
        }}
      </p>
    </div>
    <button class="button primary" @click="add">
      {{ tr("Добавить задачу", "Add case") }} +
    </button>
  </div>
  <p v-if="notice" class="save-notice" role="status">{{ notice }}</p>
  <form v-if="draft" class="admin-card editor-form" @submit.prevent="save">
    <div v-for="field in fields" :key="field[0]" class="form-columns">
      <label
        >{{ tr(field[2], field[3]) }} / RU<textarea
          v-model="draft[field[0]]"
          :rows="field[0] === 'title' ? 1 : 3"
          :maxlength="field[0] === 'title' ? 100 : 1500"
          :required="field[0] === 'title'"
        ></textarea></label
      ><label
        >{{ field[3] }} / EN<textarea
          v-model="draft[field[1]]"
          :rows="field[0] === 'title' ? 1 : 3"
          :maxlength="field[0] === 'title' ? 100 : 1500"
          :required="field[0] === 'title'"
        ></textarea>
      </label>
    </div>
    <label
      >{{ tr("Инструменты", "Tools")
      }}<input v-model="draft.stack" maxlength="300" /></label
    ><label
      >{{ tr("Схема шагов", "Flow")
      }}<input v-model="draft.flow" maxlength="150" /></label
    ><label class="checkbox-label"
      ><input v-model="draft.visible" type="checkbox" />{{
        tr("Показать на сайте", "Show on website")
      }}</label
    ><label class="checkbox-label"
      ><input v-model="draft.needsReview" type="checkbox" />{{
        tr("Описание нужно уточнить", "Description needs review")
      }}</label
    >
    <div class="form-actions">
      <button class="button primary" :disabled="site.saving">
        {{ tr("Сохранить", "Save") }}</button
      ><button type="button" class="button secondary" @click="draft = null">
        {{ tr("Отмена", "Cancel") }}</button
      ><button type="button" class="small-button" @click="remove">
        {{ tr("Удалить", "Delete") }}
      </button>
    </div>
  </form>
  <div class="admin-card admin-projects">
    <article v-for="(item, index) in site.state.cases" :key="item.id">
      <div class="project-admin-copy">
        <h3>{{ tr(item.title, item.titleEn) }}</h3>
        <p>
          {{
            item.needsReview
              ? tr("Описание уточняется", "Description under review")
              : item.stack
          }}
        </p>
      </div>
      <button class="small-button" @click="edit(item)">
        {{ tr("Изменить", "Edit") }}</button
      ><button
        class="visibility-toggle"
        :class="{ visible: item.visible }"
        @click="toggle(item)"
      >
        {{ item.visible ? tr("Виден", "Visible") : tr("Скрыт", "Hidden") }}
      </button>
      <div class="project-order">
        <button
          :disabled="index === 0"
          :aria-label="tr('Поднять задачу', 'Move case up')"
          @click="move(index, -1)"
        >
          ↑</button
        ><button
          :disabled="index === site.state.cases.length - 1"
          :aria-label="tr('Опустить задачу', 'Move case down')"
          @click="move(index, 1)"
        >
          ↓
        </button>
      </div>
    </article>
  </div>
</template>
