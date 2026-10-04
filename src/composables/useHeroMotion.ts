import { onMounted, onUnmounted, watch, type Ref } from "vue";
import { useSiteStore } from "../stores/site";
export function useHeroMotion(
  section: Ref<HTMLElement | undefined>,
  reduced: () => boolean,
) {
  const site = useSiteStore();
  let frame = 0,
    x = 0,
    y = 0;
  function paint() {
    frame = 0;
    if (!section.value) return;
    const active =
      !reduced() && site.state.quality !== "light" && !document.hidden;
    const rect = section.value.getBoundingClientRect(),
      factor = site.state.quality === "full" ? 1.5 : 1;
    section.value.style.setProperty(
      "--pointer-x",
      `${active ? x * factor : 0}px`,
    );
    section.value.style.setProperty(
      "--pointer-y",
      `${active ? y * factor : 0}px`,
    );
    section.value.style.setProperty(
      "--tilt-x",
      `${active && site.state.quality === "full" ? -y * 0.35 : 0}deg`,
    );
    section.value.style.setProperty(
      "--tilt-y",
      `${active && site.state.quality === "full" ? x * 0.35 : 0}deg`,
    );
    section.value.style.setProperty(
      "--scroll-depth",
      `${active ? Math.min(Math.max(-rect.top, 0), rect.height) * 0.07 : 0}px`,
    );
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(paint);
  }
  function pointer(event: PointerEvent) {
    if (event.pointerType !== "mouse" || !section.value) return;
    const rect = section.value.getBoundingClientRect();
    x = ((event.clientX - rect.left) / rect.width - 0.5) * 28;
    y = ((event.clientY - rect.top) / rect.height - 0.5) * 20;
    schedule();
  }
  function leave() {
    x = 0;
    y = 0;
    schedule();
  }
  watch(() => [site.state.quality, reduced()], schedule);
  onMounted(() => {
    section.value?.addEventListener("pointermove", pointer);
    section.value?.addEventListener("pointerleave", leave);
    window.addEventListener("scroll", schedule, { passive: true });
    document.addEventListener("visibilitychange", schedule);
    schedule();
  });
  onUnmounted(() => {
    cancelAnimationFrame(frame);
    section.value?.removeEventListener("pointermove", pointer);
    section.value?.removeEventListener("pointerleave", leave);
    window.removeEventListener("scroll", schedule);
    document.removeEventListener("visibilitychange", schedule);
  });
}
