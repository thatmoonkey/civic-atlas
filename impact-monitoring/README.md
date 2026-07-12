# CA M&E App — prototype

Mobile-first PWA per [../Specs/02_Build_Brief.md](../Specs/02_Build_Brief.md). No build step — plain ES modules, serve statically.

## Run it

```sh
cd "MnE app/app"
python3 -m http.server 8137 --bind 0.0.0.0
```

- **On this Mac:** http://localhost:8137
- **On your phone (same wifi):** http://192.168.0.197:8137 (IP may change; check with `ipconfig getifaddr en0`)

Note: install-to-homescreen (full PWA) needs HTTPS, so over plain LAN http it runs as a normal website — everything works except the service worker. Deploy to any static host (Netlify/Vercel/GitHub Pages) or use a tunnel (`npx untun tunnel http://localhost:8137`) to get the installable version.

## AI features — Dot

The AI guide is **Dot**: kind, very experienced with impact monitoring, allergic to jargon. Her whole personality lives in [dot-persona.md](dot-persona.md) — it's fetched at runtime by the browser and forwarded as the system instruction on every Gemini call, so you can edit her voice/behaviour and just refresh (or redeploy), no code changes. Her face is [img/dot.svg](img/dot.svg).

**The Gemini API key is server-side only.** The browser calls a Netlify Function ([netlify/functions/gemini.js](netlify/functions/gemini.js)), which reads the real key from the `GEMINI_API_KEY` environment variable (Site settings → Environment variables on Netlify) and proxies the request to Google — the key itself never ships to the client or appears in page source. To rotate the key: `netlify env:set GEMINI_API_KEY <new-key> --context production` then redeploy. Model is currently `gemini-3.5-flash` (set in the function) — Google periodically retires older model names, so if Dot starts erroring, check `GET https://generativelanguage.googleapis.com/v1beta/models?key=<key>` for what the key's account can still access.

Dot can: draft the theory of change + outcome, suggest activities, pick indicators, transcribe 15-second voice notes into tidy text (mic buttons on vision/activity/reflection inputs — needs HTTPS), and write the report narrative with **bold** skim-highlights. All Dot-facing inputs are capped at 200 characters. Dot's drafting tools are unavailable on the two wrapped example projects (Park Cleanup Committee, Ubuntu Investment Stokvel) — they're fixed, non-deletable reference cases.

## Accounts & data

Anonymous users can create a project and fill out the whole plan. **Track and Report require a free account** — email + 6-digit OTP (entered within 90 seconds, enforced client-side). Free accounts can fill in the first **3 months** of tracking; month 4+ is the paid plan (not built yet). Auth + cloud backup run on Supabase ([js/supabase.js](js/supabase.js), config in [js/config.js](js/config.js)).

One-time Supabase dashboard setup:
1. Run [supabase-setup.sql](supabase-setup.sql) in the SQL editor (creates the `mne_state` table + RLS).
2. Auth → Email Templates: add `{{ .Token }}` to the **Confirm signup** and **Magic Link** templates (e.g. "Your sign-in code: {{ .Token }}") — the default templates only send a link, not a code.
3. (Optional) Auth → Providers → Email: set OTP expiry to 90s to enforce the window server-side too.

Local persistence is localStorage (`ca_mne_v1`); when signed in, every save is mirrored to Supabase (whole state as one jsonb row per user, last-write-wins). On sign-in the cloud copy is pulled and merged (remote wins; local projects the cloud hasn't seen are kept). Settings has **Export all data (JSON)** and **Reset to starter projects**.

## Structure

- `index.html` — shell, fonts
- `css/styles.css` — design system ("community field journal": paper/green/terracotta, Fraunces + Karla)
- `js/store.js` — state, plan caps (free: 2 projects/5 activities; paid: 8/10), seeded Example + Blank projects
- `js/gemini.js` — client-side calls to the Netlify Function (ToC, activities, indicators, report narrative)
- `netlify/functions/gemini.js` — server-side proxy holding the real Gemini key
- `js/app.js` — hash router, project tabs
- `js/views/` — home, setup (4-step journey), track (monthly sheet), report (totals + time capsule + exports), settings
- `sw.js`, `manifest.webmanifest`, `icon.svg` — PWA shell
