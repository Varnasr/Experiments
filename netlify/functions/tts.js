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
        // Sarvam renamed this field; target_language_code is answered with a 400,
        // which left every read-aloud button silent.
        language_code: lang,
        speaker: "anushka",
        model: "bulbul:v2",
        pace: 0.85
      })
    });

    // Sarvam's own message says which field it rejected; a bare status code left
    // a renamed field invisible for months. It carries no key or user data.
    if (!r.ok) {
      const why = (await r.text().catch(() => "")).slice(0, 300);
      return { statusCode: 502, body: "tts failed: " + r.status + " " + why };
    }

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
