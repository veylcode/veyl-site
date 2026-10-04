<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useSiteStore } from "../stores/site";
import { useLocale } from "../composables/useLocale";
import BrandMark from "./BrandMark.vue";
import Icon from "./Icon.vue";
import StatusBadge from "./StatusBadge.vue";
const emit = defineEmits<{ close: [] }>();
const site = useSiteStore(),
  { tr } = useLocale();
const text = ref(""),
  failure = ref(""),
  loading = ref(true),
  sending = ref(false);
const panel = ref<HTMLElement>(),
  textarea = ref<HTMLTextAreaElement>(),
  messages = ref<HTMLElement>();
const disabled = computed(
  () =>
    !site.activeStatus.chatEnabled ||
    ["blocked", "closed"].includes(site.chatProfile.state),
);
const previousFocus = document.activeElement as HTMLElement | null,
  oldOverflow = document.body.style.overflow;
watch(
  () => site.state.messages.length,
  async () => {
    const nearBottom =
      !messages.value ||
      messages.value.scrollHeight -
        messages.value.scrollTop -
        messages.value.clientHeight <
        100;
    await nextTick();
    if (nearBottom && messages.value)
      messages.value.scrollTop = messages.value.scrollHeight;
  },
);
async function send() {
  if (sending.value || disabled.value) return;
  sending.value = true;
  failure.value = "";
  try {
    await site.addMessage(text.value);
    text.value = "";
    await nextTick();
    if (messages.value) messages.value.scrollTop = messages.value.scrollHeight;
    textarea.value?.focus();
  } catch (error) {
    failure.value =
      error instanceof Error
        ? error.message
        : tr("Сообщение не отправлено", "Message not sent");
  } finally {
    sending.value = false;
  }
}
async function connect() {
  loading.value = true;
  failure.value = "";
  try {
    await site.openChat();
  } catch {
    failure.value = tr(
      "Чат временно недоступен. Можно написать в Telegram.",
      "Chat is temporarily unavailable. You can contact me on Telegram.",
    );
  } finally {
    loading.value = false;
    await nextTick();
    textarea.value?.focus();
  }
}
function keydown(event: KeyboardEvent) {
  if (event.key === "Escape") emit("close");
  if (event.key !== "Tab") return;
  const nodes = panel.value?.querySelectorAll<HTMLElement>(
    "button:not(:disabled), textarea, input, a[href]",
  );
  if (!nodes?.length) return;
  const first = nodes[0],
    last = nodes[nodes.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
onMounted(() => {
  document.body.style.overflow = "hidden";
  textarea.value?.focus();
  document.addEventListener("keydown", keydown);
  void connect();
});
onUnmounted(() => {
  site.closeChat();
  document.body.style.overflow = oldOverflow;
  document.removeEventListener("keydown", keydown);
  previousFocus?.focus();
});
</script>
<template>
  <Teleport to="body"
    ><div class="chat-backdrop" @click.self="emit('close')">
      <section
        ref="panel"
        class="chat-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-title"
      >
        <header class="chat-header">
          <div>
            <BrandMark compact />
            <h2 id="chat-title">Veyl / Chat</h2>
          </div>
          <button
            class="icon-button"
            :aria-label="tr('Закрыть чат', 'Close chat')"
            @click="emit('close')"
          >
            <Icon name="close" />
          </button>
        </header>
        <div class="chat-status">
          <StatusBadge /><span>{{
            tr(site.activeStatus.description, site.activeStatus.descriptionEn)
          }}</span>
        </div>
        <div class="chat-profile">
          <label
            >{{ tr("Имя или ник", "Name or nickname")
            }}<input
              v-model="site.chatProfile.name"
              maxlength="70"
              :placeholder="
                tr('Как к тебе обращаться?', 'What should I call you?')
              " /></label
          ><label
            >Telegram / Discord<input
              v-model="site.chatProfile.contact"
              maxlength="140"
              :placeholder="tr('Необязательно', 'Optional')"
          /></label>
        </div>
        <div ref="messages" class="chat-messages" aria-live="polite">
          <div v-if="!site.state.messages.length" class="chat-welcome">
            <h3>
              {{ tr("Что хочешь сделать?", "What would you like to build?") }}
            </h3>
            <p>
              {{
                tr(
                  "Расскажи о проекте, задаче или ошибке, с которой нужна помощь.",
                  "Tell me about your project, task or an issue you need help with.",
                )
              }}
            </p>
          </div>
          <p v-if="loading" class="help-text">
            {{ tr("Открываю диалог…", "Opening conversation…") }}
          </p>
          <div
            v-for="message in site.state.messages"
            :key="message.id"
            class="message"
            :class="message.sender"
          >
            <span>{{
              message.sender === "owner" ? "Veyl" : tr("Ты", "You")
            }}</span>
            <p>{{ message.text }}</p>
            <time
              >{{
                new Date(message.time).toLocaleTimeString(
                  site.state.language === "ru" ? "ru-RU" : "en-GB",
                  { hour: "2-digit", minute: "2-digit" },
                )
              }}
              <span v-if="message.sender === 'visitor'"
                >·
                {{
                  message.readAt
                    ? tr("Прочитано", "Read")
                    : tr("Доставлено", "Delivered")
                }}</span
              ></time
            >
          </div>
        </div>
        <div v-if="failure" class="chat-error" role="alert">
          <p>{{ failure }}</p>
          <a
            v-if="site.state.settings.telegram"
            :href="site.state.settings.telegram"
            target="_blank"
            rel="noopener noreferrer"
            >Telegram ↗</a
          ><button @click="connect">{{ tr("Повторить", "Retry") }}</button>
        </div>
        <form class="chat-form" @submit.prevent="send">
          <label class="sr-only" for="chat-message">{{
            tr("Сообщение", "Message")
          }}</label
          ><textarea
            id="chat-message"
            ref="textarea"
            v-model="text"
            :placeholder="
              disabled
                ? tr(
                    'Сейчас отправка недоступна',
                    'Messaging is unavailable right now',
                  )
                : tr('Твоё сообщение…', 'Your message…')
            "
            maxlength="2000"
            rows="3"
            :disabled="loading || disabled"
            required
          ></textarea>
          <div>
            <span>{{
              tr(
                "Диалог сохранится на этом устройстве.",
                "The conversation stays available on this device.",
              )
            }}</span
            ><button
              class="button primary"
              :disabled="!text.trim() || loading || sending || disabled"
            >
              {{
                sending ? tr("Отправляю…", "Sending…") : tr("Отправить", "Send")
              }}
              <Icon />
            </button>
          </div>
        </form>
      </section></div
  ></Teleport>
</template>
