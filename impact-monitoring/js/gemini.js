// Gemini integration — all generative steps (build brief §3, §6.3).
// The actual API key never reaches the browser: the client calls a Railway-
// hosted proxy (civic-atlas-gemini-proxy repo, server.js) which holds the
// real key server-side and proxies the request to Google. Every request is
// framed by Dot's persona, loaded from dot-persona.md so it can be edited
// without touching code.

const FUNCTION_URL = "https://civic-atlas-gemini-proxy-production.up.railway.app/api/gemini";

export function hasKey() {
  // Availability now depends on server config (GEMINI_API_KEY on Railway),
  // which the client can't introspect without a round trip — assume yes and
  // surface a real error if the proxy isn't configured.
  return true;
}

/* Dot's persona — fetched once per session from the editable markdown file. */
const FALLBACK_PERSONA =
  "You are Dot, a kind, very experienced impact monitoring mentor helping small community groups. Use plain, warm, non-technical language, keep everything short, simplify to the core, and never invent numbers.";
let personaCache = null;

export async function loadPersona() {
  if (personaCache) return personaCache;
  try {
    const res = await fetch("dot-persona.md", { cache: "no-cache" });
    personaCache = res.ok ? await res.text() : FALLBACK_PERSONA;
  } catch {
    personaCache = FALLBACK_PERSONA;
  }
  return personaCache;
}

async function generate(prompt, { json = false, audio = null } = {}) {
  const persona = await loadPersona();
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, persona, json, audio }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Gemini proxy error ${res.status}`);
  }
  const text = (data.text || "").trim();
  if (!text) throw new Error("Gemini returned an empty response");
  return json ? JSON.parse(text) : text;
}

/* Voice note → cleaned-up first-person text (max 200 chars). */
export async function transcribeVoice(base64, mimeType) {
  return generate(
    `Listen to this short voice note from a community group member describing their project or reflections. Write a cleaned-up version of what they said — keep their meaning and warmth, but make it clear and neat. First person, maximum 200 characters. Return ONLY the cleaned-up text, nothing else.`,
    { audio: { data: base64, mimeType } }
  );
}

export async function draftTheoryOfChange(goalText) {
  const out = await generate(
    `The group describes what they want to achieve as: "${goalText}"

Write JSON with exactly these fields:
- "toc": one single "If ..., then ..." theory of change sentence (max 40 words).
- "outcome": one medium-term outcome sentence starting with "By the end of the year," (max 30 words), concrete and observable.`,
    { json: true }
  );
  return { toc: out.toc || "", outcome: out.outcome || "" };
}

export async function suggestActivities(toc, max) {
  const out = await generate(
    `Their theory of change: "${toc}"

Suggest ${Math.min(max, 5)} concrete recurring activities the group could realistically run to deliver this. Each must be countable month to month.
Return JSON: {"activities": ["...", "..."]} — each activity max 10 words, plain verbs, no numbering.`,
    { json: true }
  );
  return (out.activities || []).slice(0, max);
}

export async function suggestIndicators(activities) {
  const list = activities.map((a, i) => `${i + 1}. ${a.label}`).join("\n");
  const out = await generate(
    `Their activities:
${list}

For each activity give exactly one simple monthly measure that is a plain number a volunteer can count.
Return JSON: {"indicators": [{"descriptor": "...", "unit": "..."}]} in the same order. Descriptor max 5 words (e.g. "Trash collected", "Volunteers who took part"). Unit is one short word (e.g. "kg", "people", "events", "posts", "meetings").`,
    { json: true }
  );
  return out.indicators || [];
}

export async function draftAnnualNarrative(project, year, totalsRows, reflection) {
  const totals = totalsRows
    .map((r) => `- ${r.descriptor}: ${r.total} ${r.unit} over the year`)
    .join("\n");
  return generate(
    `Write the narrative section of a short annual report on behalf of the group "${project.name}" for ${year}. It may be read by a funder, or simply by the project team looking back at their year — write so it works for both.

Their vision: "${project.vision}"
Their theory of change: "${project.toc}"
The outcome they aimed for: "${project.outcome}"
What the numbers say:
${totals}
The group's own reflection on the year: "${reflection || "(none given)"}"

Write 3 short paragraphs, first person plural ("we"), warm and honest, no headings, no bullet points, no invented numbers — only use the totals above. Max 180 words.
Bold the 3 to 6 most skim-worthy phrases (key results and the strongest moments) by wrapping them in **double asterisks** — so someone skimming catches the heart of the year.`
  );
}
