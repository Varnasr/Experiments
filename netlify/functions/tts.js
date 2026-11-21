// Text-to-speech proxy for Little K Learn & Play.
// Calls Sarvam AI's Bulbul voice (natural Indian English + Hindi) and returns
// WAV audio. The API key stays server-side; responses are immutable-cacheable
// because the same text+lang always produces the same audio.

// The hosts whose pages may ask for audio: the app's own domain and the other
// addresses this repository is served from.
const OWN = /^(www\.)?littlek\.in$|^(www\.)?idealogworks\.foo$|^varnasr\.github\.io$|^(deploy-preview-\d+--)?varnasr-experiments\.netlify\.app$|^localhost$/;
const hostOf = (v) => { try { return new URL(v).hostname; } catch (e) { return null; } };

// Until 21 November 2026 any website could put this address in an <audio> tag
// and spend the Sarvam key. A browser says where a request came from in Origin
// or Referer; if either names another site the request is refused. A request
// that carries neither is let through, so a browser set to send no referrer
// still reads aloud. This stops other sites' pages, not a server calling the
// function directly.
function fromElsewhere(headers) {
  const h = headers || {};
  for (const v of [h.origin, h.referer]) {
    if (!v) continue;
    const host = hostOf(v);
    if (!host || !OWN.test(host)) return true;
  }
  return false;
}

exports.handler = async (event) => {
  if (fromElsewhere(event.headers)) return { statusCode: 403, body: "not allowed from this site" };
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
        // bulbul:v2 is withdrawn: Sarvam answers "Model 'bulbul:v2' has been
        // deprecated. Please use 'bulbul:v3' instead." v3 has its own voices and
        // anushka is not among them; priya is a v3 female voice (docs.sarvam.ai,
        // text-to-speech/convert). Pace 0.5 to 2.0 on v3.
        speaker: "priya",
        model: "bulbul:v3",
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
exports.fromElsewhere = fromElsewhere;
