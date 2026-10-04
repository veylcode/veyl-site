<script setup lang="ts">
import { computed, ref } from "vue";
import { useLocale } from "../composables/useLocale";
import { useSiteStore } from "../stores/site";
const { tr } = useLocale(),
  site = useSiteStore(),
  active = ref<string>("rtp");
const cases = computed(() => site.state.cases.filter((item) => item.visible));
const selected = computed(
  () => cases.value.find((item) => item.id === active.value) || cases.value[0],
);
</script>
<template>
  <section v-if="cases.length" class="cases-section section-pad">
    <div class="container">
      <div class="section-heading" data-reveal>
        <div>
          <h2>{{ tr("Задачи, которые решил.", "Problems I have solved.") }}</h2>
        </div>
        <p>
          {{
            tr(
              "Игровые механики, серверы, сайты и работа команды.",
              "Gameplay, servers, websites and team workflows.",
            )
          }}
        </p>
      </div>
      <div
        class="case-tabs"
        :aria-label="tr('Выбрать задачу', 'Choose a case')"
      >
        <button
          v-for="item in cases"
          :key="item.id"
          :class="{ active: selected?.id === item.id }"
          :aria-pressed="selected?.id === item.id"
          @click="active = item.id"
        >
          {{ tr(item.title, item.titleEn) }}
        </button>
      </div>
      <Transition name="case" mode="out-in"
        ><article v-if="selected" :key="selected.id" class="case-content">
          <div class="case-story">
            <h3>{{ tr(selected.title, selected.titleEn) }}</h3>
            <span v-if="selected.needsReview" class="case-review">{{
              tr("Описание уточняется", "Description under review")
            }}</span>
            <dl>
              <dt>{{ tr("Задача", "Problem") }}</dt>
              <dd>{{ tr(selected.problem, selected.problemEn) }}</dd>
              <dt>{{ tr("Что сделал", "What I did") }}</dt>
              <dd>{{ tr(selected.work, selected.workEn) }}</dd>
              <dt>{{ tr("Результат", "Result") }}</dt>
              <dd class="case-result-text">
                {{ tr(selected.result, selected.resultEn) }}
              </dd>
            </dl>
            <span class="mono">{{ selected.stack }}</span>
          </div>
          <div class="case-visual" aria-hidden="true">
            <div class="code-window">
              <div class="code-window-bar">
                <span></span><span></span><span></span
                ><i>veyl / {{ selected.id }}</i>
              </div>
              <pre><span>system</span>.connect({
  feature: <em>"{{ selected.id }}"</em>,
  project: <em>"Veyl"</em>,
  saveProgress: <b>true</b>
});</pre>
              <div class="code-flow">{{ selected.flow }}</div>
            </div>
            <div class="voxel-cube cube-one"></div>
            <div class="voxel-cube cube-two"></div>
            <span class="code-symbol">{ }</span>
          </div>
        </article></Transition
      >
    </div>
  </section>
</template>
