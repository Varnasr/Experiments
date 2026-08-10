// Stores (or removes) a push subscription for the daily practice reminder.
const { getStore } = require("@netlify/blobs");

const subId = sub => Buffer.from(sub.endpoint).toString("base64url").slice(-40);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "POST only" };
  try {
    const body = JSON.parse(event.body || "{}");
    const store = getStore("push-subs");
    if (body.unsubscribe && body.endpoint) {
      await store.delete(Buffer.from(body.endpoint).toString("base64url").slice(-40));
      return { statusCode: 200, body: JSON.stringify({ ok: true, removed: true }) };
    }
    const sub = body.subscription;
    const utcHour = Number(body.utcHour);
    if (!sub || !sub.endpoint || !Number.isInteger(utcHour) || utcHour < 0 || utcHour > 23) {
      return { statusCode: 400, body: "bad request" };
    }
    await store.setJSON(subId(sub), { sub, utcHour, added: Date.now() });
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: "store error: " + (e.message || e) };
  }
};
