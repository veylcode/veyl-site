import type { SiteData } from "../src/types.ts";
export function resolveStatus(
  site: SiteData,
  now = new Date(),
): { status: string; expired: boolean } {
  const until = site.statusUntil ? new Date(site.statusUntil).getTime() : null;
  if (until !== null && until > now.getTime())
    return { status: site.status, expired: false };
  const expired = until !== null && until <= now.getTime();
  const base = expired ? site.statusFallback : site.status;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";
  const day =
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(part("weekday")) +
    1;
  const time = `${part("hour")}:${part("minute")}`;
  const scheduled = site.schedules.find(
    (rule) =>
      rule.enabled && rule.day === day && rule.start <= time && rule.end > time,
  );
  return { status: scheduled?.status ?? base, expired };
}
