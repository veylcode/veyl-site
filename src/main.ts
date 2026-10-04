import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import "./style.css";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", component: () => import("./views/HomeView.vue") },
    ...(import.meta.env.VITE_STATIC_SITE === "true"
      ? []
      : [{ path: "/admin", component: () => import("./views/AdminView.vue") }]),
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
  scrollBehavior(to) {
    return to.hash
      ? {
          el: to.hash,
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        }
      : { top: 0 };
  },
});

router.afterEach((to) => {
  document.title =
    to.path === "/admin" ? "Veyl / Admin" : "Veyl - Minecraft / Web / Systems";
  let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!robots) {
    robots = document.createElement("meta");
    robots.name = "robots";
    document.head.append(robots);
  }
  robots.content = to.path === "/admin" ? "noindex, nofollow" : "index, follow";
});

createApp(App).use(createPinia()).use(router).mount("#app");
