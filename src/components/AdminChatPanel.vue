<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useSiteStore } from "../stores/site";
import { useLocale } from "../composables/useLocale";
import { api } from "../lib/api";
import type { Conversation, Message } from "../types";
import Icon from "./Icon.vue";
const site = useSiteStore(),
  { tr } = useLocale();
const selected = ref<string | null>(null),
  messages = ref<Message[]>([]),
  reply = ref(""),
  search = ref(""),
  filter = ref("all"),
  notes = ref(""),
  error = ref(""),
  sending = ref(false),
  editingTemplates = ref(false),
  templates = ref(site.state.quickReplies.join("\n"));
const chat = computed(() =>
  site.conversations.find((item) => item.id === selected.value),
);
const chats = computed(() =>
  site.conversations
    .filter((item) =>
      filter.value === "archive" ? item.archived : !item.archived,
    )
    .filter((item) => filter.value !== "unread" || item.unread > 0)
    .filter((item) =>
      `${item.name} ${item.contact} ${item.lastMessage}`
        .toLowerCase()
        .includes(search.value.toLowerCase()),
    ),
);
let events: EventSource | undefined;
async function load() {
  if (!selected.value) return;
  const response = await api<{ messages: Message[] }>(
    `/api/admin/conversations/${selected.value}/messages`,
  );
  messages.value = response.messages;
}
async function open(id: string) {
  selected.value = id;
  notes.value = site.conversations.find((item) => item.id === id)?.notes || "";
  error.value = "";
  try {
    await load();
    await api(`/api/admin/conversations/${id}/read`, "POST", {});
    await site.refreshConversations();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Error";
  }
}
async function send() {
  if (!selected.value || sending.value) return;
  sending.value = true;
  error.value = "";
  try {
    await api(`/api/admin/conversations/${selected.value}/messages`, "POST", {
      text: reply.value,
    });
    reply.value = "";
    await load();
    await site.refreshConversations();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Error";
  } finally {
    sending.value = false;
  }
}
async function patch(value: Partial<Conversation>) {
  if (!selected.value) return;
  try {
    await api(`/api/admin/conversations/${selected.value}`, "PATCH", value);
    await site.refreshConversations();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Error";
  }
}
async function saveTemplates() {
  site.state.quickReplies = templates.value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  try {
    await site.saveSite();
    editingTemplates.value = false;
  } catch {
    /* Error is shown in the shell. */
  }
}
async function notifications() {
  if ("Notification" in window) await Notification.requestPermission();
}
onMounted(() => {
  events = new EventSource("/api/admin/events");
  events.onmessage = (event) => {
    if (JSON.parse(event.data).topic !== "chat") return;
    if (selected.value) void load().catch(() => {});
    if (
      "Notification" in window &&
      Notification.permission === "granted" &&
      document.hidden
    )
      new Notification("Veyl / Chat", {
        body: tr(
          "В диалогах есть обновление.",
          "A conversation has been updated.",
        ),
      });
  };
});
onUnmounted(() => events?.close());
</script>
<template>
  <div class="admin-section-title">
    <div>
      <h2>{{ tr("Диалоги", "Chats") }}</h2>
      <p>
        {{
          tr(
            "Сообщения с сайта в реальном времени.",
            "Website messages in real time.",
          )
        }}
      </p>
    </div>
    <button class="small-button" @click="notifications">
      {{ tr("Включить уведомления", "Enable notifications") }}
    </button>
  </div>
  <p v-if="error" class="form-error" role="alert">{{ error }}</p>
  <div class="admin-chat-layout" :class="{ 'chat-selected': selected }">
    <aside class="admin-card conversation-list">
      <label class="sr-only" for="conversation-search">{{
        tr("Поиск диалога", "Search conversations")
      }}</label
      ><input
        id="conversation-search"
        v-model="search"
        class="conversation-search"
        :placeholder="tr('Имя, контакт, сообщение…', 'Name, contact, message…')"
      />
      <div class="chat-filters">
        <button :class="{ active: filter === 'all' }" @click="filter = 'all'">
          {{ tr("Все", "All") }}</button
        ><button
          :class="{ active: filter === 'unread' }"
          @click="filter = 'unread'"
        >
          {{ tr("Новые", "Unread") }}</button
        ><button
          :class="{ active: filter === 'archive' }"
          @click="filter = 'archive'"
        >
          {{ tr("Архив", "Archive") }}
        </button>
      </div>
      <button
        v-for="item in chats"
        :key="item.id"
        class="conversation-entry"
        :class="{ selected: selected === item.id }"
        @click="open(item.id)"
      >
        <span class="visitor-avatar">{{
          (item.name || "V")[0]?.toUpperCase()
        }}</span>
        <div>
          <strong
            >{{ item.pinned ? "↟ " : ""
            }}{{ item.name || tr("Посетитель", "Visitor") }}</strong
          >
          <p>{{ item.lastMessage || tr("Нет сообщений", "No messages") }}</p>
        </div>
        <span v-if="item.unread" class="unread-count">{{ item.unread }}</span>
      </button>
      <p v-if="!chats.length" class="empty-state">
        {{ tr("Пока диалогов нет.", "No conversations yet.") }}
      </p>
    </aside>
    <section class="admin-card admin-conversation">
      <template v-if="chat"
        ><header>
          <div>
            <button class="mobile-chat-back" @click="selected = null">
              ← {{ tr("Все диалоги", "All chats") }}
            </button>
            <h3>{{ chat.name || tr("Посетитель", "Visitor") }}</h3>
            <p>
              {{
                chat.contact || tr("Контакт не указан", "No contact provided")
              }}
              · {{ chat.state }}
            </p>
          </div>
          <Icon name="chat" />
        </header>
        <div class="conversation-tools">
          <button
            :class="{ active: chat.pinned }"
            @click="patch({ pinned: !chat.pinned })"
          >
            {{
              chat.pinned ? tr("Открепить", "Unpin") : tr("Закрепить", "Pin")
            }}</button
          ><button @click="patch({ archived: !chat.archived })">
            {{
              chat.archived
                ? tr("Из архива", "Unarchive")
                : tr("В архив", "Archive")
            }}</button
          ><button @click="patch({ muted: !chat.muted })">
            {{
              chat.muted
                ? tr("Включить звук", "Unmute")
                : tr("Без звука", "Mute")
            }}</button
          ><button
            @click="
              patch({ state: chat.state === 'closed' ? 'active' : 'closed' })
            "
          >
            {{
              chat.state === "closed"
                ? tr("Открыть", "Reopen")
                : tr("Закрыть", "Close")
            }}</button
          ><button
            @click="
              patch({ state: chat.state === 'blocked' ? 'active' : 'blocked' })
            "
          >
            {{
              chat.state === "blocked"
                ? tr("Разблокировать", "Unblock")
                : tr("Блокировать", "Block")
            }}
          </button>
        </div>
        <div class="admin-message-list">
          <div
            v-for="message in messages"
            :key="message.id"
            class="message"
            :class="message.sender === 'owner' ? 'visitor' : 'owner'"
          >
            <span>{{
              message.sender === "owner"
                ? "Veyl"
                : chat.name || tr("Посетитель", "Visitor")
            }}</span>
            <p>{{ message.text }}</p>
            <time
              >{{
                new Date(message.time).toLocaleString(
                  site.state.language === "ru" ? "ru-RU" : "en-GB",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "numeric",
                    month: "short",
                  },
                )
              }}
              {{
                message.sender === "owner"
                  ? message.readAt
                    ? "· ✓✓"
                    : "· ✓"
                  : ""
              }}</time
            >
          </div>
          <p v-if="!messages.length" class="empty-state">
            {{ tr("Пока сообщений нет.", "No messages yet.") }}
          </p>
        </div>
        <div class="quick-replies">
          <button
            v-for="(template, index) in site.state.quickReplies"
            :key="index"
            @click="reply = template"
          >
            {{ template }}
          </button>
        </div>
        <form class="admin-reply" @submit.prevent="send">
          <label class="sr-only" for="admin-reply">{{
            tr("Ответ посетителю", "Reply to visitor")
          }}</label
          ><textarea
            id="admin-reply"
            v-model="reply"
            rows="3"
            :placeholder="tr('Написать ответ…', 'Write a reply…')"
            maxlength="2000"
            required
          ></textarea>
          <div>
            <button
              type="button"
              class="small-button"
              @click="editingTemplates = !editingTemplates"
            >
              {{ tr("Быстрые ответы", "Quick replies") }}</button
            ><button
              class="button primary"
              :disabled="!reply.trim() || sending"
            >
              {{
                sending ? tr("Отправляю…", "Sending…") : tr("Отправить", "Send")
              }}
              <Icon />
            </button>
          </div>
        </form>
        <div class="chat-notes">
          <label
            >{{
              tr(
                "Заметка для себя / посетитель её не видит",
                "Private note / hidden from visitor",
              )
            }}<textarea
              v-model="notes"
              rows="2"
              maxlength="2000"
            ></textarea></label
          ><button class="small-button" @click="patch({ notes })">
            {{ tr("Сохранить заметку", "Save note") }}
          </button>
        </div></template
      >
      <p v-else class="empty-state choose-chat">
        {{ tr("Выбери диалог слева.", "Choose a conversation on the left.") }}
      </p>
    </section>
  </div>
  <form
    v-if="editingTemplates"
    class="admin-card editor-form quick-reply-editor"
    @submit.prevent="saveTemplates"
  >
    <h3>{{ tr("Быстрые ответы", "Quick replies") }}</h3>
    <label
      >{{
        tr(
          "Один ответ на строку. Порядок строк задаёт порядок кнопок.",
          "One reply per line. Line order determines button order.",
        )
      }}<textarea v-model="templates" rows="7"></textarea>
    </label>
    <div class="form-actions">
      <button class="button primary">{{ tr("Сохранить", "Save") }}</button
      ><button
        type="button"
        class="button secondary"
        @click="editingTemplates = false"
      >
        {{ tr("Отмена", "Cancel") }}
      </button>
    </div>
  </form>
</template>
