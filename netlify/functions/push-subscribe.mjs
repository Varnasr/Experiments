// Stores (or removes) a push subscription for the daily practice reminder.
import { getStore } from "@netlify/blobs";

const subId = endpoint => Buffer.from(endpoint).toString("base64url").slice(-40);

export default async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  try {
    const body = await req.json();
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
