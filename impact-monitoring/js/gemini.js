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

// Turn a big-picture vision into ONE realistic, measurable one-year goal.
// This is the intermediary step: the vision stays a dream, the goal is the
// stepping stone that activities and monthly numbers can actually flow from.
export async function draftYearGoal(vision) {
  const out = await generate(
    `The group's big-picture vision is: "${vision}"

That vision is their long-term dream. Help them set ONE realistic, concrete goal they could actually reach in the NEXT 12 MONTHS — a single stepping stone toward the vision, not the whole vision.

The goal MUST be:
- Small and specific enough that progress can be counted with simple monthly numbers (how many, how much, how often)
- Realistically achievable by a small volunteer group in one year
- One warm, plain sentence starting with "By this time next year,"

Return JSON: {"goal": "..."} — max 30 words, no jargon.`,
    { json: true }
  );
  return out.goal || "";
}

export async function suggestActivities(goal, max) {
  const out = await generate(
    `Their goal for the next year: "${goal}"

Suggest ${Math.min(max, 5)} concrete recurring activities the group could realistically run each month to reach this goal. Each must be countable month to month.
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

// Two modes:
//  - full year (all 12 months tracked): a complete annual report that weaves
//    in the group's own year-end reflection (time-capsule inputs).
//  - progress (fewer months in): a mid-year snapshot of progress so far, which
//    ignores any reflection and never writes as if the year were finished.
export async function draftAnnualNarrative(project, year, totalsRows, reflection, { fullYear = true, monthsTracked = 12 } = {}) {
  const span = fullYear ? "over the year" : "so far";
  const totals = totalsRows
    .map((r) => `- ${r.descriptor}: ${r.total} ${r.unit} ${span}`)
    .join("\n");

  if (!fullYear) {
    return generate(
      `Write a short PROGRESS UPDATE (not a finished annual report) on behalf of the group "${project.name}", covering ${year} SO FAR — ${monthsTracked} month${monthsTracked === 1 ? "" : "s"} of tracking in.

Their vision: "${project.vision}"
The goal they set for this year: "${project.outcome}"
What the numbers say so far:
${totals}

Write 2 to 3 short paragraphs, first person plural ("we"), warm and honest. This is a mid-year snapshot: describe how things are going so far and progress toward the goal. Do NOT write as if the year is finished, do NOT invent a year-end reflection or results that haven't happened yet, and use ONLY the totals above (no invented numbers). Max 150 words.
Bold the 3 to 5 most skim-worthy phrases (key results so far) by wrapping them in **double asterisks**.`
    );
  }

  return generate(
    `Write the narrative section of a full annual report on behalf of the group "${project.name}" for ${year} — all 12 months are now complete. It may be read by a funder, or simply by the project team looking back at their year — write so it works for both.

Their vision: "${project.vision}"
The goal they set for this year: "${project.outcome}"
What the numbers say:
${totals}
The group's own reflection on the year: "${reflection || "(none given)"}"

Write 3 short paragraphs, first person plural ("we"), warm and honest, no headings, no bullet points, no invented numbers — only use the totals above. Weave in the group's own reflection where it fits naturally. Max 180 words.
Bold the 3 to 6 most skim-worthy phrases (key results and the strongest moments) by wrapping them in **double asterisks** — so someone skimming catches the heart of the year.`
  );
}
