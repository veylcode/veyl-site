<script setup lang="ts">
import Icon from "./Icon.vue";
import { useLocale } from "../composables/useLocale";
const { tr } = useLocale();
</script>
<template>
  <section id="systems" class="systems-section section-pad">
    <div class="container systems-layout">
      <div data-reveal>
        <h2>
          {{ tr("Соединяю игру,", "Connecting the game,") }}<br /><span>{{
            tr("сайт и сервисы.", "website and services.")
          }}</span>
        </h2>
        <p>
          {{
            tr(
              "Общие роли и данные. Автоматическая верификация. Уведомления без ручного переноса между системами.",
              "Shared roles and data. Automatic verification. Notifications without moving information manually between systems.",
            )
          }}
        </p>
        <div class="systems-caption">
          <Icon name="code" /><span
            >Discord API / Webhooks<br />Database / Plugin Messaging</span
          >
        </div>
      </div>
      <div
        class="network-scene"
        data-reveal
        :aria-label="
          tr(
            'Minecraft связан с ядром Veyl, базой данных, сайтом и Discord',
            'Minecraft connected to Veyl core, a database, website and Discord',
          )
        "
      >
        <svg class="network-lines" viewBox="0 0 500 390" aria-hidden="true">
          <path
            d="M90 100H190L250 195M410 100H310L250 195M100 300H180L250 195M400 300H320L250 195"
          />
        </svg>
        <div class="network-core"><span>V</span><small>Veyl core</small></div>
        <div class="network-node node-minecraft">
          <Icon name="cube" /><span>Minecraft</span
          ><small>{{ tr("Сервер и плагины", "Server & plugins") }}</small>
        </div>
        <div class="network-node node-data">
          <Icon name="grid" /><span>Database</span
          ><small>{{ tr("Общие данные", "Shared data") }}</small>
        </div>
        <div class="network-node node-web">
          <Icon name="code" /><span>Web panel</span
          ><small>{{ tr("Управление", "Management") }}</small>
        </div>
        <div class="network-node node-discord">
          <Icon name="chat" /><span>Discord / API</span
          ><small>{{ tr("Интеграции", "Integrations") }}</small>
        </div>
      </div>
    </div>
  </section>
</template>
