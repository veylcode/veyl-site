import { defineStore } from "pinia";
import { computed, onScopeDispose, reactive, ref, watch } from "vue";
import { createSeed, defaultStatuses } from "../data/seed";
import { api, ApiError } from "../lib/api";
import type {
  Conversation,
  SiteState,
  Message,
  PublicSite,
  SiteData,
  StatusId,
} from "../types";

export const statuses = Object.fromEntries(
  defaultStatuses.map((status) => [status.id, status]),
);
export const useSiteStore = defineStore("site", () => {
  const state = reactive<SiteState>({
    ...createSeed(),
    quality: "balanced",
    theme: "dark",
    language: "ru",
    messages: [],
  });
  try {
    const preferences = JSON.parse(
      localStorage.getItem("veyl-preferences") || "{}",
    );
    state.theme = preferences.theme === "light" ? "light" : "dark";
    state.language = preferences.language === "en" ? "en" : "ru";
    state.quality = ["full", "balanced", "light"].includes(preferences.quality)
      ? preferences.quality
      : "balanced";
  } catch {
    /* Preferences are optional. */
  }
  watch(
    () => [state.theme, state.language, state.quality],
    () => {
      document.documentElement.dataset.theme = state.theme;
      document.documentElement.dataset.motion = state.quality;
      document.documentElement.lang = state.language;
      try {
        localStorage.setItem(
          "veyl-preferences",
          JSON.stringify({
            theme: state.theme,
            language: state.language,
            quality: state.quality,
          }),
        );
      } catch {
        /* Private browsing can disable storage. */
      }
    },
    { immediate: true },
  );
  const authenticated = ref(false),
    connected = ref(false),
    saving = ref(false),
    error = ref(""),
    revision = ref(0);
  const conversations = ref<Conversation[]>([]);
  const chatProfile = reactive({ name: "", contact: "", state: "new" });
  const displayStatus = ref("offline");
  const statusMap = computed(() =>
    Object.fromEntries(
      state.statusDefinitions.map((status) => [status.id, status]),
    ),
  );
  const activeStatus = computed(
    () =>
      statusMap.value[displayStatus.value] ??
      defaultStatuses.find((item) => item.id === "offline")!,
  );
  const unread = computed(() =>
    conversations.value.reduce(
      (sum, chat) => sum + (chat.muted ? 0 : chat.unread),
      0,
    ),
  );
  let publicEvents: EventSource | undefined,
    adminEvents: EventSource | undefined,
    chatEvents: EventSource | undefined;
  let queue: Promise<void> = Promise.resolve();
  function getData(): SiteData {
    return structuredClone(
      JSON.parse(
        JSON.stringify({
          content: state.content,
          settings: state.settings,
          status: state.status,
          statusUntil: state.statusUntil,
          statusFallback: state.statusFallback,
          statusDefinitions: state.statusDefinitions,
          projects: state.projects,
          cases: state.cases,
          workload: state.workload,
          schedules: state.schedules,
          quickReplies: state.quickReplies,
        }),
      ),
    );
  }
  async function loadPublic() {
    if (authenticated.value) return;
    try {
      const response = await api<PublicSite & { revision: number }>(
        import.meta.env.VITE_STATIC_SITE === "true"
          ? `${import.meta.env.BASE_URL}site.json`
          : "/api/public/site",
      );
      Object.assign(state, response);
      displayStatus.value = response.status;
      revision.value = response.revision;
      connected.value = true;
    } catch {
      connected.value = false;
      displayStatus.value = "offline";
    }
  }
  async function loadAdmin() {
    const response = await api<{
      site: SiteData;
      revision: number;
      effectiveStatus: string;
    }>("/api/admin/site");
    Object.assign(state, response.site);
    displayStatus.value = response.effectiveStatus;
    revision.value = response.revision;
    connected.value = true;
    await refreshConversations();
  }
  async function refreshConversations() {
    const response = await api<{ conversations: Conversation[] }>(
      "/api/admin/conversations",
    );
    conversations.value = response.conversations;
  }
  function connectPublic() {
    void loadPublic();
    if (import.meta.env.VITE_STATIC_SITE === "true") return;
    publicEvents = new EventSource("/api/public/events");
    publicEvents.onmessage = () => {
      if (!authenticated.value) void loadPublic();
    };
  }
  function connectAdmin() {
    adminEvents?.close();
    adminEvents = new EventSource("/api/admin/events");
    adminEvents.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.topic === "chat") void refreshConversations().catch(() => {});
      else if (!saving.value) void loadAdmin().catch(() => {});
    };
  }
  async function checkSession() {
    try {
      await api("/api/admin/session");
      authenticated.value = true;
      await loadAdmin();
      connectAdmin();
    } catch {
      authenticated.value = false;
    }
  }
  async function login(password: string) {
    await api("/api/admin/login", "POST", { password });
    authenticated.value = true;
    await loadAdmin();
    connectAdmin();
  }
  async function logout() {
    await api("/api/admin/logout", "POST");
    authenticated.value = false;
    adminEvents?.close();
    conversations.value = [];
    await loadPublic();
  }
  async function saveSite() {
    const snapshot = getData();
    const action = queue
      .catch(() => {})
      .then(async () => {
        saving.value = true;
        error.value = "";
        try {
          const response = await api<{
            revision: number;
            effectiveStatus: string;
          }>("/api/admin/site", "PUT", {
            site: snapshot,
            revision: revision.value,
          });
          revision.value = response.revision;
          displayStatus.value = response.effectiveStatus;
        } catch (cause) {
          error.value =
            cause instanceof Error
              ? cause.message
              : "Ошибка сохранения / Save failed";
          if (cause instanceof ApiError && cause.status === 401)
            authenticated.value = false;
          throw cause;
        } finally {
          saving.value = false;
        }
      });
    queue = action;
    return action;
  }
  async function setStatus(id: StatusId) {
    state.status = id;
    state.statusUntil = null;
    await saveSite();
  }
  async function loadChat() {
    const response = await api<{
      messages: Message[];
      conversation: { name: string; contact: string; state: string };
    }>("/api/chat/messages");
    state.messages = response.messages;
    if (response.conversation)
      Object.assign(chatProfile, response.conversation);
    if (
      response.messages.some(
        (message) => message.sender === "owner" && !message.readAt,
      )
    )
      await api("/api/chat/read", "POST", {});
  }
  async function openChat() {
    await api("/api/chat/session", "POST", {});
    await loadChat();
    chatEvents?.close();
    chatEvents = new EventSource("/api/chat/events");
    chatEvents.onmessage = () => {
      void loadChat().catch(() => {});
    };
  }
  function closeChat() {
    chatEvents?.close();
    chatEvents = undefined;
  }
  async function addMessage(
    text: string,
    _sender: Message["sender"] = "visitor",
  ) {
    await api("/api/chat/profile", "POST", {
      name: chatProfile.name,
      contact: chatProfile.contact,
    });
    await api("/api/chat/messages", "POST", { text, website: "" });
    await loadChat();
  }
  async function reset() {
    Object.assign(state, createSeed());
    await saveSite();
  }
  onScopeDispose(() => {
    publicEvents?.close();
    adminEvents?.close();
    chatEvents?.close();
  });
  return {
    state,
    authenticated,
    connected,
    saving,
    error,
    conversations,
    activeStatus,
    statusMap,
    unread,
    chatProfile,
    connectPublic,
    checkSession,
    login,
    logout,
    loadAdmin,
    refreshConversations,
    saveSite,
    setStatus,
    openChat,
    closeChat,
    addMessage,
    reset,
  };
});
