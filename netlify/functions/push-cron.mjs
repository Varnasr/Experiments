// Runs hourly. Sends the daily practice notification to every subscription
// whose chosen hour matches now (UTC).
import { getStore } from "@netlify/blobs";
import webpush from "web-push";

export default async () => {
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return new Response("no vapid keys", { status: 503 });
  webpush.setVapidDetails("mailto:varna.sr@gmail.com", pub, priv);

  const hour = new Date().getUTCHours();
  const store = getStore("push-subs");
  const { blobs } = await store.list();
  let sent = 0, cleaned = 0;

  for (const b of blobs) {
    const rec = await store.get(b.key, { type: "json" });
    if (!rec || rec.utcHour !== hour) continue;
    try {
      await webpush.sendNotification(rec.sub, JSON.stringify({
        title: "⭐ Today's 5 time!",
        body: "Five little questions with Kundendu — little and often wins!",
        url: "https://littlek.in/"
      }));
      sent++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) { await store.delete(b.key); cleaned++; }
    }
  }
  return Response.json({ hour, sent, cleaned });
};

export const config = { schedule: "0 * * * *" };
