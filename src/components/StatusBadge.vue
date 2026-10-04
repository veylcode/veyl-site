<script setup lang="ts">
import { useSiteStore } from "../stores/site";
import { useLocale } from "../composables/useLocale";
import { computed, ref } from "vue";
const site = useSiteStore();
const { tr } = useLocale();
const expanded = ref(false);
const count = computed(() =>
  site.authenticated
    ? site.state.workload.projectNames.length
    : site.state.workload.count,
);
</script>
<template>
  <span
    v-if="
      site.state.settings.statusVisible && site.activeStatus.id === 'projects'
    "
    class="workload-badge"
    ><button
      class="status-badge workload-trigger"
      :aria-expanded="expanded"
      :title="
        tr(site.activeStatus.description, site.activeStatus.descriptionEn)
      "
      @click="expanded = !expanded"
    >
      <i :style="{ background: site.activeStatus.color }"></i
      >{{ tr("Занят проектами", "Busy with projects") }}<b>{{ count }}</b
      ><span aria-hidden="true">⌄</span></button
    ><span v-if="expanded" class="workload-popover"
      ><strong>{{ tr("Текущая работа", "Current work") }} · {{ count }}</strong
      ><span
        v-for="name in site.state.workload.showNames
          ? site.state.workload.projectNames
          : []"
        :key="name"
        >{{ name }}</span
      ><span v-if="!site.state.workload.showNames">{{
        tr("Названия проектов скрыты.", "Project names are private.")
      }}</span
      ><span v-if="count === 0">{{
        tr("Список пока не заполнен.", "The list is not filled in yet.")
      }}</span></span
    ></span
  >
  <span
    v-else-if="site.state.settings.statusVisible"
    class="status-badge"
    :title="tr(site.activeStatus.description, site.activeStatus.descriptionEn)"
    ><i :style="{ background: site.activeStatus.color }"></i
    >{{ tr(site.activeStatus.nameRu, site.activeStatus.label) }}</span
  >
</template>
