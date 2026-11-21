// Stores (or removes) a push subscription for the daily practice reminder.
import { getStore } from "@netlify/blobs";
import webpush from "web-push";

const subId = endpoint => Buffer.from(endpoint).toString("base64url").slice(-40);

// A push subscription's endpoint is an address at the browser maker's push
// service. Until 21 November 2026 the test path would send a signed request to
// whatever address a caller supplied, and the store path would keep it for the
// hourly job to call. Only the push services of Chrome and Edge on Android and
// desktop, Firefox, Windows and Apple are accepted.
const PUSH_HOST = /^fcm\.googleapis\.com$|\.push\.services\.mozilla\.com$|\.notify\.windows\.com$|^web\.push\.apple\.com$|\.push\.apple\.com$/;
export function pushEndpointOk(endpoint) {
  try {
    const u = new URL(String(endpoint));
    return u.protocol === "https:" && PUSH_HOST.test(u.hostname);
  } catch (e) { return false; }
}

export default async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  try {
    const body = await req.json();
    const given = (body.subscription && body.subscription.endpoint) || body.endpoint;
    if (given && !pushEndpointOk(given)) return new Response("bad request", { status: 400 });

    // instant test notification, so parents can verify delivery in seconds
    if (body.test && body.subscription && body.subscription.endpoint) {
      const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
      if (!pub || !priv) return new Response("no vapid keys", { status: 503 });
      webpush.setVapidDetails("mailto:info@idealog.works", pub, priv);
      try {
        await webpush.sendNotification(body.subscription, JSON.stringify({
          title: "Notifications are working",
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
