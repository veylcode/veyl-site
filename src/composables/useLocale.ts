import { useSiteStore } from "../stores/site";
export function useLocale() {
  const site = useSiteStore();
  const tr = (ru: string, en: string) =>
    site.state.language === "en" ? en : ru;
  return { tr };
}
