import { onMounted, onUnmounted, ref } from "vue";

export function useScene() {
  const reducedMotion = ref(false);
  let observer: IntersectionObserver | undefined;
  let motionObserver: IntersectionObserver | undefined;
  let media: MediaQueryList | undefined;
  const update = () => {
    reducedMotion.value = media?.matches ?? false;
  };
  const visibility = () =>
    document.documentElement.classList.toggle("motion-hidden", document.hidden);
  onMounted(() => {
    media = matchMedia("(prefers-reduced-motion: reduce)");
    update();
    media.addEventListener("change", update);
    document.documentElement.classList.add("motion-ready");
    visibility();
    document.addEventListener("visibilitychange", visibility);
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer?.unobserve(entry.target);
          }
      },
      { threshold: 0.12 },
    );
    document
      .querySelectorAll("[data-reveal]")
      .forEach((el) => observer?.observe(el));
    motionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries)
        entry.target.classList.toggle("motion-paused", !entry.isIntersecting);
    });
    document
      .querySelectorAll(".cases-section,.systems-section")
      .forEach((el) => motionObserver?.observe(el));
  });
  onUnmounted(() => {
    observer?.disconnect();
    motionObserver?.disconnect();
    document.removeEventListener("visibilitychange", visibility);
    media?.removeEventListener("change", update);
    document.documentElement.classList.remove("motion-ready");
    document.documentElement.classList.remove("motion-hidden");
  });
  return { reducedMotion };
}
