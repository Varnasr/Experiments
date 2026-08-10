// Stores (or removes) a push subscription for the daily practice reminder.
import { getStore } from "@netlify/blobs";
import webpush from "web-push";

const subId = endpoint => Buffer.from(endpoint).toString("base64url").slice(-40);

export default async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  try {
    const body = await req.json();

    // instant test notification, so parents can verify delivery in seconds
    if (body.test && body.subscription && body.subscription.endpoint) {
      const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
      if (!pub || !priv) return new Response("no vapid keys", { status: 503 });
      webpush.setVapidDetails("mailto:varna.sr@gmail.com", pub, priv);
      try {
        await webpush.sendNotification(body.subscription, JSON.stringify({
          title: "🔔 Test — notifications are working!",
          body: "This is how the daily Today's 5 reminder will look.",
          url: "https://littlek.in/"
        }));
        return Response.json({ ok: true, test: true });
      } catch (e) {
        return new Response("push failed: " + (e.statusCode || e.message), { status: 502 });
      }
    }

    const store = getStore("push-subs");
    if (body.unsubscribe && body.endpoint) {
      await store.delete(subId(body.endpoint));
      return Response.json({ ok: true, removed: true });
    }
    const sub = body.subscription;
    const utcHour = Number(body.utcHour);
    if (!sub || !sub.endpoint || !Number.isInteger(utcHour) || utcHour < 0 || utcHour > 23) {
      return new Response("bad request", { status: 400 });
    }
    await store.setJSON(subId(sub.endpoint), { sub, utcHour, added: Date.now() });
    return Response.json({ ok: true });
  } catch (e) {
    return new Response("store error: " + (e.message || e), { status: 500 });
  }
};
