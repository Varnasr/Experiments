// Text-to-speech proxy for Kundendu's Learn & Play.
// Calls Sarvam AI's Bulbul voice (natural Indian English + Hindi) and returns
// WAV audio. The API key stays server-side; responses are immutable-cacheable
// because the same text+lang always produces the same audio.

exports.handler = async (event) => {
  const KEY = process.env.SARVAM_API_KEY;
  if (!KEY) return { statusCode: 503, body: "tts unavailable" };

  const params = event.queryStringParameters || {};
  const text = String(params.text || "").slice(0, 400).trim();
  const lang = params.lang === "hi-IN" ? "hi-IN" : "en-IN";
  if (!text) return { statusCode: 400, body: "no text" };

  try {
    const r = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        target_language_code: lang,
        speaker: "anushka",
        model: "bulbul:v2",
        pace: 0.85
      })
    });

    if (!r.ok) return { statusCode: 502, body: "tts failed: " + r.status };

    const data = await r.json();
    const b64 = data.audios && data.audios[0];
    if (!b64) return { statusCode: 502, body: "no audio" };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "public, max-age=31536000, immutable"
      },
      body: b64,
      isBase64Encoded: true
    };
  } catch (e) {
    return { statusCode: 502, body: "tts error" };
  }
};
