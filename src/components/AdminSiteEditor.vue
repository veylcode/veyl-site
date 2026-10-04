<script setup lang="ts">
import { reactive, ref } from "vue";
import { useSiteStore } from "../stores/site";
import { useLocale } from "../composables/useLocale";
const site = useSiteStore(),
  { tr } = useLocale();
const draft = reactive({ ...site.state.content }),
  settings = reactive({ ...site.state.settings }),
  saved = ref(false);
async function save() {
  Object.assign(site.state.content, draft);
  Object.assign(site.state.settings, settings);
  try {
    await site.saveSite();
    saved.value = true;
  } catch {
    saved.value = false;
  }
}
</script>
<template>
  <div class="admin-section-title">
    <div>
      <h2>{{ tr("Тексты и контакты", "Website copy & contacts") }}</h2>
      <p>
        {{
          tr(
            "Отдельные тексты для русского и английского.",
            "Separate copy for Russian and English.",
          )
        }}
      </p>
    </div>
  </div>
  <form class="admin-card editor-form" @submit.prevent="save">
    <div class="form-columns">
      <label
        >{{ tr("Фраза первого экрана / RU", "Hero headline / RU")
        }}<input v-model="draft.title" required maxlength="100" /></label
      ><label
        >Hero headline / EN<input
          v-model="draft.titleEn"
          required
          maxlength="100"
      /></label>
    </div>
    <div class="form-columns">
      <label
        >{{ tr("Описание / RU", "Description / RU")
        }}<textarea
          v-model="draft.subtitle"
          rows="3"
          maxlength="450"
        ></textarea></label
      ><label
        >Description / EN<textarea
          v-model="draft.subtitleEn"
          rows="3"
          maxlength="450"
        ></textarea>
      </label>
    </div>
    <div class="form-columns">
      <label
        >{{ tr("О себе / RU", "About / RU")
        }}<textarea
          v-model="draft.about"
          rows="5"
          maxlength="1200"
        ></textarea></label
      ><label
        >About / EN<textarea
          v-model="draft.aboutEn"
          rows="5"
          maxlength="1200"
        ></textarea>
      </label>
    </div>
    <div class="form-columns">
      <label
        >Telegram<input
          v-model="settings.telegram"
          type="url"
          placeholder="https://t.me/…" /></label
      ><label
        >Discord<input v-model="settings.discord" maxlength="100"
      /></label>
    </div>
    <label
      >GitHub<input
        v-model="settings.github"
        type="url"
        placeholder="https://github.com/…"
    /></label>
    <div class="form-columns">
      <label
        >{{ tr("Кнопка чата / RU", "Chat button / RU")
        }}<input
          v-model="settings.chatButtonRu"
          maxlength="70"
          required /></label
      ><label
        >Chat button / EN<input
          v-model="settings.chatButtonEn"
          maxlength="70"
          required
      /></label>
    </div>
    <label class="checkbox-label"
      ><input v-model="settings.chatVisible" type="checkbox" />{{
        tr("Показывать чат", "Show chat")
      }}</label
    ><label class="checkbox-label"
      ><input v-model="settings.statusVisible" type="checkbox" />{{
        tr("Показывать статус", "Show status")
      }}</label
    >
    <div class="form-actions">
      <button class="button primary" :disabled="site.saving">
        {{ tr("Сохранить изменения", "Save changes") }}</button
      ><span v-if="saved" class="save-notice" role="status">{{
        tr("Сохранено на сервере", "Saved on server")
      }}</span>
    </div>
  </form>
</template>
