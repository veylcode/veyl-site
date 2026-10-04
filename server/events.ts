import type { ServerResponse } from "node:http";
interface Subscriber {
  response: ServerResponse;
  kind: "admin" | "visitor" | "public";
  subject: string;
  expires: number;
  sessionHash?: string;
}
export function createEvents() {
  const subscribers = new Set<Subscriber>();
  function attach(subscriber: Subscriber) {
    subscribers.add(subscriber);
    subscriber.response.on("close", () => subscribers.delete(subscriber));
    subscriber.response.write("retry: 3000\n\n");
  }
  function notify(topic: "site" | "chat", subject = "") {
    for (const subscriber of subscribers) {
      if (subscriber.expires < Date.now()) {
        subscriber.response.end();
        subscribers.delete(subscriber);
        continue;
      }
      if (
        topic === "site" ||
        subscriber.kind === "admin" ||
        (subscriber.kind === "visitor" && subscriber.subject === subject)
      ) {
        subscriber.response.write(`data: ${JSON.stringify({ topic })}\n\n`);
      }
    }
  }
  const keepalive = setInterval(() => {
    for (const subscriber of subscribers) {
      if (subscriber.expires < Date.now()) {
        subscriber.response.end();
        subscribers.delete(subscriber);
      } else subscriber.response.write(": heartbeat\n\n");
    }
  }, 20000);
  keepalive.unref();
  function revoke(hash?: string) {
    for (const subscriber of subscribers)
      if (
        subscriber.kind === "admin" &&
        (!hash || subscriber.sessionHash === hash)
      ) {
        subscriber.response.end();
        subscribers.delete(subscriber);
      }
  }
  function close() {
    clearInterval(keepalive);
    for (const subscriber of subscribers) subscriber.response.end();
    subscribers.clear();
  }
  return { attach, notify, revoke, close };
}
