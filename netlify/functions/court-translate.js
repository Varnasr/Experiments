// Netlify Function: Hindi → English Supreme Court Petition Translator
// Experiment: court-translator
// Uses Sarvam.ai for base translation + Groq/GPT-OSS 120B for legal terminology refinement.
// Groq shut down llama-3.3-70b-versatile on 16 August 2026 and names openai/gpt-oss-120b
// as its replacement (console.groq.com/docs/deprecations). Until this change every
// refinement failed and the page showed the raw Sarvam output.

const MAX_CHUNK = 1800;

function splitIntoChunks(text) {
  const paragraphs = text.split(/\n\n+/);
  const chunks = [];
  let current = "";

  for (const para of paragraphs) {
    if (para.length === 0) continue;

    if (para.length <= MAX_CHUNK) {
      if (current.length + para.length + 2 <= MAX_CHUNK) {
        current += (current ? "\n\n" : "") + para;
      } else {
        if (current) chunks.push(current);
        current = para;
      }
    } else {
      if (current) { chunks.push(current); current = ""; }
      const sentences = para.split(/(?<=[।.])\s*/);
      for (const sentence of sentences) {
        if (!sentence) continue;
        if (sentence.length > MAX_CHUNK) {
          for (let i = 0; i < sentence.length; i += MAX_CHUNK) {
            chunks.push(sentence.slice(i, i + MAX_CHUNK));
          }
        } else if (current.length + sentence.length + 1 <= MAX_CHUNK) {
          current += (current ? " " : "") + sentence;
        } else {
          if (current) chunks.push(current);
          current = sentence;
        }
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function translateChunk(text) {
  const res = await fetch("https://api.sarvam.ai/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": process.env.SARVAM_API_KEY,
    },
    body: JSON.stringify({
      input: text,
      source_language_code: "hi-IN",
      target_language_code: "en-IN",
      model: "sarvam-translate:v1",
      mode: "formal",
      numerals_format: "international",
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Sarvam API ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  return data.translated_text;
}

async function refineLegalTranslation(rawTranslation) {
  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      // A reasoning model: keep its reasoning short and out of the reply, and leave
      // room in the token budget for both the reasoning and the translation.
      reasoning_effort: "low",
      include_reasoning: false,
      messages: [
        {
          role: "system",
          content: `You are a legal translation editor specialising in Indian Supreme Court and High Court petitions. Your task is to refine a machine-translated English text so it reads like a professional court document.

Rules:
1. Use standard Indian legal English terminology consistently:
   - Petitioner, Respondent, Hon'ble, Learned (counsel/judge), Petition, Writ Petition, Special Leave Petition
   - Article (of the Constitution), Section (of an Act), Rule, Order, Clause
   - Prayer, Grounds, Cause of Action, Synopsis, List of Dates
   - Judgment, Decree, Order, Appeal, Review, Revision
   - Act, Statute, Ordinance, Regulation, Notification, Gazette
   - Affidavit, Vakalatnama, Memo of Parties, Court Fee
   - "passed an order" (not "gave an order"), "filed a petition" (not "submitted")
   - "disposed of" (not "resolved"), "set aside" (not "cancelled")
2. Preserve case citation formats (AIR, SCC, SCR references) exactly as they appear.
3. Maintain formal legal register — no contractions, no colloquialisms.
4. Preserve the original paragraph structure and section headings.
5. Do NOT add, remove, or summarise any content. Only refine the language.
6. If a Hindi term has no direct English equivalent, keep it transliterated in italics with the English meaning in parentheses on first use.
7. Numbers, dates, and proper nouns must remain unchanged.

Output ONLY the refined English translation. No explanations, no preamble.`,
        },
        {
          role: "user",
          content: rawTranslation,
        },
      ],
      max_completion_tokens: 8192,
    }),
  });

  if (!groqRes.ok) throw new Error(`Groq API ${groqRes.status}`);

  const data = await groqRes.json();
  return data.choices?.[0]?.message?.content || rawTranslation;
}

exports.handler = async function (event) {
  // The page calls this function by its absolute netlify.app address so the GitHub
  // Pages copy works too. Only the site's own origins may call it from a browser;
  // "*" let any website spend the Sarvam and Groq keys. A server can still call it
  // directly, since CORS binds browsers only.
  const origin = event.headers?.origin || "";
  const allowed = /^https:\/\/(idealogworks\.foo|varnasr\.github\.io|varnasr-experiments\.netlify\.app|deploy-preview-\d+--varnasr-experiments\.netlify\.app)$/.test(origin)
    || /^http:\/\/localhost(:\d+)?$/.test(origin);
  const headers = {
    "Access-Control-Allow-Origin": allowed ? origin : "https://idealogworks.foo",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "POST required" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { text } = body;
  if (!text || !text.trim()) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "text is required" }) };
  }

  const trimmed = text.trim();
  if (trimmed.length > 50000) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Text too long. Maximum 50,000 characters." }) };
  }

  const chunks = splitIntoChunks(trimmed);

  let rawParts;
  try {
    rawParts = await Promise.all(chunks.map(translateChunk));
  } catch (e) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: "Translation failed. Please try again." }) };
  }

  const rawTranslation = rawParts.join("\n\n");

  let refined;
  let refinementApplied = true;
  try {
    refined = await refineLegalTranslation(rawTranslation);
  } catch (e) {
    refined = rawTranslation;
    refinementApplied = false;
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      translation: refined,
      chunksProcessed: chunks.length,
      refinementApplied,
    }),
  };
};
