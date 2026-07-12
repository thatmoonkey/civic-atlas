// Server-side proxy for Gemini calls. The real API key lives only here,
// as the Netlify env var GEMINI_API_KEY — it never reaches the browser.
// The client (js/gemini.js) posts { prompt, persona, json, audio } and
// gets back Gemini's parsed response.

const MODEL = "gemini-3.5-flash";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server is missing GEMINI_API_KEY" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { prompt, persona, json = false, audio = null } = payload;
  if (!prompt || typeof prompt !== "string") {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing prompt" }) };
  }

  const parts = [];
  if (audio?.data && audio?.mimeType) {
    parts.push({ inlineData: { mimeType: audio.mimeType, data: audio.data } });
  }
  parts.push({ text: prompt });

  const body = {
    contents: [{ parts }],
    systemInstruction: { parts: [{ text: persona || "You are Dot, a kind, very experienced impact monitoring mentor." }] },
    generationConfig: {
      temperature: 0.7,
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
  };

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    const data = await res.json();
    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: data?.error?.message || "Gemini request failed" }) };
    }
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: e.message || "Upstream error" }) };
  }
};
