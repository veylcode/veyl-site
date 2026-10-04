<script setup lang="ts">
const assetBase = import.meta.env.BASE_URL;
import { computed, onMounted, ref } from "vue";
import BrandMark from "../components/BrandMark.vue";
import Icon from "../components/Icon.vue";
import StatusBadge from "../components/StatusBadge.vue";
import DisplayControls from "../components/DisplayControls.vue";
import AdminProjectEditor from "../components/AdminProjectEditor.vue";
import AdminCaseEditor from "../components/AdminCaseEditor.vue";
import AdminChatPanel from "../components/AdminChatPanel.vue";
import AdminStatusEditor from "../components/AdminStatusEditor.vue";
import AdminSiteEditor from "../components/AdminSiteEditor.vue";
import AdminSettings from "../components/AdminSettings.vue";
import { useSiteStore } from "../stores/site";
import { useLocale } from "../composables/useLocale";
const site = useSiteStore(),
  { tr } = useLocale();
type Tab =
  "dashboard" | "chats" | "status" | "projects" | "cases" | "site" | "settings";
const tabs = computed(() => [
  { id: "dashboard" as Tab, label: tr("Обзор", "Overview"), icon: "grid" },
  { id: "chats" as Tab, label: tr("Диалоги", "Chats"), icon: "chat" },
  { id: "status" as Tab, label: tr("Статус", "Status"), icon: "check" },
  { id: "projects" as Tab, label: tr("Проекты", "Projects"), icon: "cube" },
  { id: "cases" as Tab, label: tr("Задачи", "Cases"), icon: "code" },
  { id: "site" as Tab, label: tr("Сайт", "Website"), icon: "code" },
  {
    id: "settings" as Tab,
    label: tr("Настройки", "Settings"),
    icon: "settings",
  },
]);
const currentTab = ref<Tab>("dashboard"),
  password = ref(""),
  busy = ref(false),
  loginError = ref(""),
  checking = ref(true);
const activeTab = computed(() =>
  tabs.value.find((tab) => tab.id === currentTab.value),
);
const visibleProjects = computed(
  () =>
    site.state.projects.filter(
      (project) =>
        project.visible && !["draft", "private"].includes(project.state || ""),
    ).length,
);
async function enter() {
  busy.value = true;
  loginError.value = "";
  try {
    await site.login(password.value);
    password.value = "";
  } catch (error) {
    loginError.value =
      error instanceof Error
        ? error.message
        : tr("Не удалось войти", "Could not sign in");
  } finally {
    busy.value = false;
  }
}
async function changeStatus(id: string) {
  try {
    await site.setStatus(id);
  } catch {
    /* Store exposes the error. */
  }
}
async function exit() {
  try {
    await site.logout();
  } catch {
    site.error = tr(
      "Не удалось выйти. Повтори.",
      "Could not sign out. Try again.",
    );
  }
}
onMounted(async () => {
  await site.checkSession();
  checking.value = false;
});
</script>
<template>
  <div v-if="!site.authenticated" class="admin-entry">
    <div class="entry-top">
      <RouterLink class="entry-brand" to="/"><BrandMark /></RouterLink
      ><DisplayControls />
    </div>
    <div class="entry-layout">
      <div class="entry-art">
        <img
          :src="`${assetBase}assets/emblem.webp`"
          alt="Veyl"
          width="960"
          height="960"
        />
      </div>
      <div class="entry-copy">
        <h1>Veyl / Admin</h1>
        <p>
          {{ tr("Вход в панель управления.", "Sign in to the control panel.") }}
        </p>
        <p v-if="checking" class="help-text">
          {{ tr("Проверяю сессию…", "Checking session…") }}
        </p>
        <form v-else class="login-form" @submit.prevent="enter">
          <label
            >{{ tr("Пароль", "Password")
            }}<input
              v-model="password"
              type="password"
              autocomplete="current-password"
              required
              :disabled="busy"
          /></label>
          <p v-if="loginError" class="form-error" role="alert">
            {{ loginError }}
          </p>
          <button class="button primary" :disabled="busy || !password">
            {{ busy ? tr("Вхожу…", "Signing in…") : tr("Войти", "Sign in") }}
            <Icon />
          </button>
        </form>
        <RouterLink class="entry-back" to="/"
          >← {{ tr("Вернуться на сайт", "Back to the website") }}</RouterLink
        >
      </div>
    </div>
  </div>
  <div v-else class="admin-shell">
    <aside class="admin-sidebar">
      <RouterLink to="/" class="admin-brand"><BrandMark /></RouterLink>
      <div class="workspace-label">
        <span>Veyl / Admin <i></i></span>
      </div>
      <nav :aria-label="tr('Разделы панели', 'Panel sections')">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="{ active: currentTab === tab.id }"
          @click="currentTab = tab.id"
        >
          <Icon :name="tab.icon" /><span>{{ tab.label }}</span
          ><span
            v-if="tab.id === 'chats' && site.unread"
            class="sidebar-count"
            >{{ site.unread }}</span
          >
        </button>
      </nav>
      <div class="sidebar-bottom">
        <RouterLink to="/"
          >{{ tr("Открыть сайт", "Open website") }} <Icon
        /></RouterLink>
        <div class="sidebar-owner">
          <img
            :src="`${assetBase}assets/avatar.webp`"
            width="40"
            height="40"
            alt="Veyl"
          />
          <div>
            <strong>Veyl</strong><span>{{ tr("Владелец", "Owner") }}</span>
          </div>
          <button :aria-label="tr('Выйти из панели', 'Sign out')" @click="exit">
            ↪
          </button>
        </div>
      </div>
    </aside>
    <div class="admin-main">
      <header class="admin-topbar">
        <div>
          <span>Veyl / Admin</span><span>/</span
          ><strong>{{ activeTab?.label }}</strong>
        </div>
        <div>
          <DisplayControls /><span v-if="site.saving" class="admin-label">{{
            tr("Сохраняю…", "Saving…")
          }}</span
          ><RouterLink to="/" class="small-button"
            >{{ tr("На сайт", "Website") }} <Icon
          /></RouterLink>
        </div>
      </header>
      <main class="admin-content">
        <p v-if="site.error" class="form-error" role="alert">
          {{ site.error }}
        </p>
        <template v-if="currentTab === 'dashboard'"
          ><div class="admin-welcome">
            <div>
              <h1>{{ tr("Привет, Veyl", "Hello, Veyl") }}<span>.</span></h1>
              <p>
                {{
                  tr(
                    "Сообщения, проекты и доступность.",
                    "Messages, projects and availability.",
                  )
                }}
              </p>
            </div>
            <StatusBadge />
          </div>
          <div class="dashboard-stats">
            <article class="admin-card">
              <span
                >{{ tr("Текущий статус", "Current status") }}
                <Icon name="check"
              /></span>
              <h2>
                {{ tr(site.activeStatus.nameRu, site.activeStatus.label) }}
              </h2>
              <button @click="currentTab = 'status'">
                {{ tr("Изменить статус", "Change status") }} ↗
              </button>
            </article>
            <article class="admin-card">
              <span
                >{{ tr("Непрочитанные", "Unread messages") }} <Icon name="chat"
              /></span>
              <h2>
                {{ site.unread
                }}<small>{{ tr("новых сообщений", "new messages") }}</small>
              </h2>
              <button @click="currentTab = 'chats'">
                {{ tr("Открыть диалоги", "Open chats") }} ↗
              </button>
            </article>
            <article class="admin-card">
              <span>{{ tr("Проекты", "Projects") }} <Icon name="cube" /></span>
              <h2>
                {{ visibleProjects
                }}<small>{{
                  tr("видны на сайте", "visible on website")
                }}</small>
              </h2>
              <button @click="currentTab = 'projects'">
                {{ tr("Управлять проектами", "Manage projects") }} ↗
              </button>
            </article>
          </div>
          <div class="dashboard-grid">
            <section class="admin-card dashboard-status">
              <div class="panel-heading"><h3>Veyl / Status</h3></div>
              <p>{{ tr("Быстрое переключение", "Quick switch") }}</p>
              <div class="status-options">
                <button
                  v-for="status in site.state.statusDefinitions.slice(0, 4)"
                  :key="status.id"
                  :class="{ selected: site.state.status === status.id }"
                  @click="changeStatus(status.id)"
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
            <section class="admin-card site-preview-card">
              <div class="panel-heading">
                <h3>{{ tr("Твой сайт", "Your website") }}</h3>
              </div>
              <img
                :src="`${assetBase}assets/banner.webp`"
                width="1672"
                height="941"
                alt="Veyl"
              />
              <div>
                <h3>Veyl / Minecraft. Web. Systems.</h3>
                <p>
                  {{
                    tr(
                      "Изменения хранятся на сервере.",
                      "Changes are stored on the server.",
                    )
                  }}
                </p>
                <RouterLink class="button secondary" to="/"
                  >{{ tr("Посмотреть сайт", "View website") }} <Icon
                /></RouterLink>
              </div>
            </section></div
        ></template>
        <AdminChatPanel v-else-if="currentTab === 'chats'" />
        <AdminProjectEditor v-else-if="currentTab === 'projects'" />
        <AdminCaseEditor v-else-if="currentTab === 'cases'" />
        <AdminStatusEditor v-else-if="currentTab === 'status'" />
        <AdminSiteEditor v-else-if="currentTab === 'site'" />
        <AdminSettings v-else />
      </main>
      <footer class="admin-footer">
        <span>Veyl / Admin</span
        ><span>{{ tr("Серверное хранение", "Server storage") }} · v1.0</span>
      </footer>
    </div>
  </div>
</template>
