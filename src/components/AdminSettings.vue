<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useSiteStore } from "../stores/site";
import { useLocale } from "../composables/useLocale";
import { api } from "../lib/api";
const site = useSiteStore(),
  { tr } = useLocale();
const current = ref(""),
  next = ref(""),
  confirm = ref(""),
  error = ref(""),
  changing = ref(false);
const audit = ref<{ event: string; time: string }[]>([]);
async function changePassword() {
  if (next.value !== confirm.value) {
    error.value = tr("Пароли не совпадают.", "Passwords do not match.");
    return;
  }
  changing.value = true;
  error.value = "";
  try {
    await api("/api/admin/password", "POST", {
      current: current.value,
      next: next.value,
    });
    current.value = "";
    next.value = "";
    confirm.value = "";
    site.authenticated = false;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Error";
  } finally {
    changing.value = false;
  }
}
onMounted(async () => {
  try {
    const response = await api<{ events: typeof audit.value }>(
      "/api/admin/audit",
    );
    audit.value = response.events;
  } catch {
    /* Optional history panel. */
  }
});
</script>
<template>
  <div class="admin-section-title">
    <div>
      <h2>{{ tr("Настройки", "Settings") }}</h2>
      <p>
        {{
          tr(
            "Эффекты, доступ и история изменений.",
            "Effects, access and change history.",
          )
        }}
      </p>
    </div>
  </div>
  <section class="admin-card settings-card">
    <h3>{{ tr("Эффекты", "Effects") }}</h3>
    <p>
      {{
        tr(
          "Эта настройка влияет только на твой браузер.",
          "This setting only affects your browser.",
        )
      }}
    </p>
    <label
      >{{ tr("Качество анимации", "Animation quality")
      }}<select v-model="site.state.quality">
        <option value="full">Full</option>
        <option value="balanced">Balanced</option>
        <option value="light">Light</option>
      </select></label
    >
    <p>
      {{
        tr(
          "Системная настройка уменьшения движения имеет приоритет.",
          "The system reduced-motion setting takes priority.",
        )
      }}
    </p>
  </section>
  <form
    class="admin-card editor-form password-settings"
    @submit.prevent="changePassword"
  >
    <h3>{{ tr("Изменить пароль", "Change password") }}</h3>
    <p class="help-text">
      {{
        tr(
          "Минимум 12 символов. После изменения все сессии владельца завершатся.",
          "At least 12 characters. Changing the password ends all owner sessions.",
        )
      }}
    </p>
    <label
      >{{ tr("Текущий пароль", "Current password")
      }}<input
        v-model="current"
        type="password"
        autocomplete="current-password"
        required /></label
    ><label
      >{{ tr("Новый пароль", "New password")
      }}<input
        v-model="next"
        type="password"
        minlength="12"
        maxlength="256"
        autocomplete="new-password"
        required /></label
    ><label
      >{{ tr("Повторить новый пароль", "Repeat new password")
      }}<input
        v-model="confirm"
        type="password"
        minlength="12"
        maxlength="256"
        autocomplete="new-password"
        required
    /></label>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <button class="button primary" :disabled="changing">
      {{
        changing
          ? tr("Сохраняю…", "Saving…")
          : tr("Изменить пароль", "Change password")
      }}
    </button>
  </form>
  <section class="admin-card audit-panel">
    <h3>{{ tr("Последние действия", "Recent activity") }}</h3>
    <div v-for="(event, index) in audit" :key="index">
      <span>{{ event.event }}</span
      ><time>{{
        new Date(event.time).toLocaleString(
          site.state.language === "ru" ? "ru-RU" : "en-GB",
        )
      }}</time>
    </div>
    <p v-if="!audit.length" class="empty-state">
      {{ tr("Пока записей нет.", "No activity yet.") }}
    </p>
  </section>
</template>
