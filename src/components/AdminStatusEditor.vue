<script setup lang="ts">
import { computed, ref } from "vue";
import { useSiteStore } from "../stores/site";
import { useLocale } from "../composables/useLocale";
import { defaultStatuses } from "../data/seed";
import type { StatusDefinition } from "../types";
import Icon from "./Icon.vue";
import StatusBadge from "./StatusBadge.vue";
const site = useSiteStore(),
  { tr } = useLocale();
const workList = ref(site.state.workload.projectNames.join("\n"));
async function saveWorkload() {
  site.state.workload.projectNames = workList.value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  site.state.workload.count = site.state.workload.projectNames.length;
  await save();
}
const draft = ref<StatusDefinition | null>(null),
  notice = ref(""),
  end = ref(""),
  editing = ref(false);
const days = computed(() => [
  tr("Понедельник", "Monday"),
  tr("Вторник", "Tuesday"),
  tr("Среда", "Wednesday"),
  tr("Четверг", "Thursday"),
  tr("Пятница", "Friday"),
  tr("Суббота", "Saturday"),
  tr("Воскресенье", "Sunday"),
]);
function localTime(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
end.value = localTime(site.state.statusUntil);
async function save() {
  try {
    await site.saveSite();
    notice.value = tr("Сохранено.", "Saved.");
    return true;
  } catch {
    notice.value = "";
    return false;
  }
}
async function choose(id: string) {
  end.value = "";
  notice.value = "";
  try {
    await site.setStatus(id);
  } catch {
    /* Store displays error. */
  }
}
async function saveEnd() {
  if (end.value && new Date(end.value).getTime() <= Date.now()) {
    notice.value = tr("Выбери время в будущем.", "Choose a future date.");
    return;
  }
  site.state.statusUntil = end.value ? new Date(end.value).toISOString() : null;
  await save();
}
async function busyHour() {
  site.state.status = "busy";
  site.state.statusUntil = new Date(Date.now() + 3600000).toISOString();
  end.value = localTime(site.state.statusUntil);
  await save();
}
function create() {
  editing.value = false;
  draft.value = {
    id: `custom-${crypto.randomUUID()}`,
    label: "",
    nameRu: "",
    description: "",
    descriptionEn: "",
    color: "#669de0",
    responseTime: "",
    chatEnabled: true,
    acceptingProjects: true,
  };
}
function edit(status: StatusDefinition) {
  editing.value = true;
  draft.value = { ...status };
}
async function saveDefinition() {
  if (!draft.value) return;
  const index = site.state.statusDefinitions.findIndex(
    (status) => status.id === draft.value!.id,
  );
  if (index < 0) site.state.statusDefinitions.push({ ...draft.value });
  else site.state.statusDefinitions[index] = { ...draft.value };
  if (await save()) draft.value = null;
}
async function removeDefinition(id: string) {
  const fallback = site.state.statusDefinitions.find(
    (status) => status.id !== id,
  )!.id;
  if (site.state.status === id) site.state.status = fallback;
  if (site.state.statusFallback === id) site.state.statusFallback = fallback;
  site.state.schedules = site.state.schedules.filter(
    (rule) => rule.status !== id,
  );
  site.state.statusDefinitions = site.state.statusDefinitions.filter(
    (status) => status.id !== id,
  );
  await save();
}
function addRule() {
  site.state.schedules.push({
    id: crypto.randomUUID(),
    day: 1,
    start: "08:30",
    end: "16:00",
    status: "school",
    enabled: true,
  });
}
async function removeRule(id: string) {
  site.state.schedules = site.state.schedules.filter((rule) => rule.id !== id);
  await save();
}
</script>
<template>
  <section class="admin-card editor-form workload-editor">
    <h3>{{ tr("Текущие проекты", "Current projects") }}</h3>
    <p class="help-text">
      {{
        tr(
          "Используется в статусе «Занят проектами». Один проект на строку; количество считается автоматически.",
          "Used in the Busy with projects status. One project per line; the count is automatic.",
        )
      }}
    </p>
    <form @submit.prevent="saveWorkload">
      <label
        >{{ tr("Названия проектов", "Project names")
        }}<textarea
          v-model="workList"
          rows="4"
          maxlength="3000"
          :placeholder="
            tr(
              'Название первого проекта\nНазвание второго проекта',
              'First project name\nSecond project name',
            )
          "
        ></textarea></label
      ><label class="checkbox-label"
        ><input v-model="site.state.workload.showNames" type="checkbox" />{{
          tr(
            "Показывать названия посетителям",
            "Show project names to visitors",
          )
        }}</label
      ><button class="button primary" :disabled="site.saving">
        {{ tr("Сохранить список", "Save list") }}
      </button>
    </form>
  </section>
  <div class="admin-section-title">
    <div>
      <h2>{{ tr("Статус и доступность", "Status & availability") }}</h2>
      <p>
        {{
          tr(
            "Статусы, отпуск до даты и автоматическое расписание.",
            "Statuses, vacation end dates and automatic schedules.",
          )
        }}
      </p>
    </div>
    <StatusBadge />
  </div>
  <p v-if="notice" class="save-notice" role="status">{{ notice }}</p>
  <div class="status-manager-grid">
    <section class="admin-card status-editor">
      <div class="status-options">
        <button
          v-for="status in site.state.statusDefinitions"
          :key="status.id"
          :class="{ selected: site.state.status === status.id }"
          @click="choose(status.id)"
        >
          <i :style="{ background: status.color }"></i
          ><span
            >{{ tr(status.nameRu, status.label)
            }}<small>{{
              tr(status.description, status.descriptionEn)
            }}</small></span
          ><Icon v-if="site.state.status === status.id" name="check" />
        </button>
      </div>
    </section>
    <section class="admin-card editor-form expiration-form">
      <h3>{{ tr("Когда вернёшься?", "When will you be back?") }}</h3>
      <p class="help-text">
        {{
          tr(
            "Для отпуска, занятости и любого другого статуса. Таймер работает на сервере, даже если закрыть сайт.",
            "For vacation, busy time or any other status. The timer runs on the server even when this page is closed.",
          )
        }}
      </p>
      <form @submit.prevent="saveEnd">
        <label
          >{{ tr("Статус действует до", "Status active until")
          }}<input v-model="end" type="datetime-local" /></label
        ><label
          >{{ tr("После окончания", "After it ends")
          }}<select v-model="site.state.statusFallback">
            <option
              v-for="status in site.state.statusDefinitions"
              :key="status.id"
              :value="status.id"
            >
              {{ tr(status.nameRu, status.label) }}
            </option>
          </select></label
        >
        <div class="form-actions">
          <button class="button primary" :disabled="site.saving">
            {{ tr("Сохранить", "Save") }}</button
          ><button
            type="button"
            class="button secondary"
            @click="
              end = '';
              saveEnd();
            "
          >
            {{ tr("Без срока", "No end date") }}
          </button>
        </div>
      </form>
      <button class="small-button busy-hour" @click="busyHour">
        {{ tr("Занят на 1 час", "Busy for 1 hour") }}
      </button>
    </section>
  </div>
  <section class="admin-card status-definitions">
    <div class="panel-heading">
      <h3>{{ tr("Настройки статусов", "Status definitions") }}</h3>
      <button class="small-button" @click="create">
        {{ tr("Добавить статус", "Add status") }} +
      </button>
    </div>
    <div class="status-definition-list">
      <div v-for="status in site.state.statusDefinitions" :key="status.id">
        <i :style="{ background: status.color }"></i
        ><span>{{ tr(status.nameRu, status.label) }}</span
        ><button class="small-button" @click="edit(status)">
          {{ tr("Изменить", "Edit") }}</button
        ><button
          v-if="!defaultStatuses.some((item) => item.id === status.id)"
          class="small-button"
          @click="removeDefinition(status.id)"
        >
          {{ tr("Удалить", "Delete") }}
        </button>
      </div>
    </div>
    <form
      v-if="draft"
      class="editor-form status-definition-form"
      @submit.prevent="saveDefinition"
    >
      <h3>
        {{
          editing
            ? tr("Изменить статус", "Edit status")
            : tr("Новый статус", "New status")
        }}
      </h3>
      <div class="form-columns">
        <label
          >{{ tr("Название / RU", "Name / RU")
          }}<input v-model="draft.nameRu" required maxlength="70" /></label
        ><label
          >Name / EN<input v-model="draft.label" required maxlength="70"
        /></label>
      </div>
      <div class="form-columns">
        <label
          >{{ tr("Описание / RU", "Description / RU")
          }}<input v-model="draft.description" maxlength="220" /></label
        ><label
          >Description / EN<input v-model="draft.descriptionEn" maxlength="220"
        /></label>
      </div>
      <div class="form-columns">
        <label
          >{{ tr("Цвет", "Color")
          }}<input v-model="draft.color" type="color" /></label
        ><label
          >{{ tr("Ожидаемое время ответа", "Expected response time")
          }}<input v-model="draft.responseTime" maxlength="120"
        /></label>
      </div>
      <label class="checkbox-label"
        ><input v-model="draft.chatEnabled" type="checkbox" />{{
          tr("Разрешить новые сообщения", "Allow new messages")
        }}</label
      ><label class="checkbox-label"
        ><input v-model="draft.acceptingProjects" type="checkbox" />{{
          tr("Принимать новые проекты", "Accept new projects")
        }}</label
      >
      <div class="form-actions">
        <button class="button primary">{{ tr("Сохранить", "Save") }}</button
        ><button type="button" class="button secondary" @click="draft = null">
          {{ tr("Отмена", "Cancel") }}
        </button>
      </div>
    </form>
  </section>
  <section class="admin-card schedule-manager">
    <div class="panel-heading">
      <h3>{{ tr("Недельное расписание", "Weekly schedule") }}</h3>
      <button class="small-button" @click="addRule">
        {{ tr("Добавить правило", "Add rule") }} +
      </button>
    </div>
    <p class="help-text">
      {{
        tr(
          "Время Москвы. Статус с заданной датой окончания временно перекрывает расписание. Первое подходящее правило имеет приоритет.",
          "Moscow time. A status with an end date temporarily overrides the schedule. The first matching rule takes priority.",
        )
      }}
    </p>
    <form @submit.prevent="save">
      <div
        v-for="rule in site.state.schedules"
        :key="rule.id"
        class="schedule-row"
      >
        <label class="checkbox-label"
          ><input v-model="rule.enabled" type="checkbox" />{{
            tr("Вкл.", "On")
          }}</label
        ><select
          v-model="rule.day"
          :aria-label="tr('День недели', 'Day of week')"
        >
          <option v-for="(day, index) in days" :key="index" :value="index + 1">
            {{ day }}
          </option></select
        ><input
          v-model="rule.start"
          type="time"
          required
          :aria-label="tr('Начало', 'Start')"
        /><input
          v-model="rule.end"
          type="time"
          required
          :aria-label="tr('Окончание', 'End')"
        /><select
          v-model="rule.status"
          :aria-label="tr('Статус по расписанию', 'Scheduled status')"
        >
          <option
            v-for="status in site.state.statusDefinitions"
            :key="status.id"
            :value="status.id"
          >
            {{ tr(status.nameRu, status.label) }}
          </option></select
        ><button
          type="button"
          class="icon-button"
          :aria-label="tr('Удалить правило', 'Delete rule')"
          @click="removeRule(rule.id)"
        >
          <Icon name="close" />
        </button>
      </div>
      <p v-if="!site.state.schedules.length" class="empty-state">
        {{ tr("Расписание пока не задано.", "No schedules yet.") }}
      </p>
      <button class="button primary">
        {{ tr("Сохранить расписание", "Save schedule") }}
      </button>
    </form>
  </section>
</template>
