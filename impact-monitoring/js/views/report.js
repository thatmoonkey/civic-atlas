import { el, toast, busy, dotAvatar, md, withCounter, voiceButton, MONTHS, currentYear, download } from "../ui.js";
import { annualTotals, yearCoverage, save, debouncedSave } from "../store.js";
import { hasKey, draftAnnualNarrative } from "../gemini.js";

// Annual report — totals roll-up, sparkline chart, time-capsule reflection,
// Dot's narrative, exports (build brief §4).

export function renderReport(root, project, state) {
  state.reportYear = state.reportYear || defaultYear(project);
  const year = state.reportYear;
  const totals = annualTotals(project, year);
  const refl = (project.reflections[year] = project.reflections[year] || { evidence: "", quote: "", narrative: "" });
  const rows = project.activities.map((a) => ({
    descriptor: a.indicator.descriptor || a.label,
    unit: a.indicator.unit,
    ...totals[a.id],
  }));
  const anyData = rows.some((r) => r.monthly.some((v) => v !== null));

  const stack = el("div", { class: "stack stack--lg" });
  root.append(stack);

  stack.append(
    el("div", { class: "reveal no-print" },
      el("p", { class: "eyebrow" }, "Annual report"),
      el("h1", {}, `The ${year} story`),
      el("p", { class: "lede", style: "margin:8px 0 12px" }, "Everything you counted, rolled into one document — for your funder or just for the team."),
      yearStrip(project, state)
    )
  );

  /* header card (prints as the report cover) */
  stack.append(
    el("div", { class: "card reveal" },
      el("img", { src: "img/ca-wide.svg", alt: "Civic Atlas", style: "height:22px;display:block;margin-bottom:12px;opacity:0.85" }),
      el("p", { class: "eyebrow" }, `Annual report · ${year}`),
      el("h2", {}, project.name),
      el("p", { style: "margin-top:8px;font-family:var(--font-display);font-size:1.05rem;line-height:1.4" }, project.vision),
      project.photo ? el("img", { class: "vision-photo", src: project.photo, alt: "Project photo" }) : null,
      el("hr", { class: "divider" }),
      el("p", { class: "field-label" }, "Our goal for this year"),
      el("p", { style: "font-size:0.95rem" }, project.outcome)
    )
  );

  /* totals table */
  const table = el("table", { class: "report-table" },
    el("thead", {}, el("tr", {},
      el("th", {}, "What we counted"),
      el("th", { class: "num" }, "Unit"),
      el("th", { class: "num" }, `Total ${year}`)
    )),
    el("tbody", {}, ...rows.map((r) =>
      el("tr", {},
        el("td", {}, r.descriptor),
        el("td", { class: "num" }, r.unit),
        el("td", { class: "num total" }, anyData ? String(r.total) : "—")
      )
    ))
  );
  stack.append(
    el("div", { class: "card reveal" },
      el("h3", {}, "The year in numbers"),
      el("div", { style: "overflow-x:auto;margin-top:10px" }, table),
      anyData
        ? el("p", { class: "small", style: "margin-top:10px" }, coverageLine(project, year))
        : el("p", { class: "empty-note" }, "No monthly numbers for this year yet — capture a few months first.")
    )
  );

  /* month-by-month chart */
  if (anyData) {
    stack.append(
      el("div", { class: "card reveal" },
        el("h3", {}, "Month by month"),
        el("p", { class: "small", style: "margin-top:4px" }, `Each bar is one month, ${MONTHS[0]}–${MONTHS[11]} ${year}.`),
        ...rows.map((r) =>
          el("div", { class: "spark-row" },
            el("div", { class: "row row--between" },
              el("span", { style: "font-weight:700;font-size:0.92rem" }, r.descriptor),
              el("span", { class: "spark-total" }, `${r.total} ${r.unit}`)
            ),
            sparkline(r.monthly)
          )
        )
      )
    );
  }

  /* time capsule reflection — the year-end mirror. Locked until a full 12
     months of data is in, so reflecting is a genuine end-of-year moment.
     Wrapped examples are finished demos, so they always show it. */
  const locked = project.wrapped;
  const monthsTracked = yearCoverage(project, year);
  const capsuleReady = project.wrapped || monthsTracked >= 12;

  if (!capsuleReady) {
    stack.append(
      el("div", { class: "timecapsule timecapsule--locked reveal" },
        el("p", { class: "eyebrow", style: "color:var(--terra-deep)" }, "🔒 Your time capsule"),
        el("p", { style: "margin-top:8px;font-size:0.95rem" },
          `At the start you set a goal for this year. Once all 12 months are tracked, Dot opens your time capsule — you'll see the goal again and reflect on how it really went. ${monthsTracked} of 12 months in so far.`),
        el("div", { class: "meter", style: "margin-top:12px" },
          el("i", { style: `width:${Math.round((monthsTracked / 12) * 100)}%` }))
      )
    );
  } else {
    const evTa = el("textarea", {
      placeholder: "What actually happened? What did you see change? What would you do differently?",
      disabled: locked,
      oninput: () => { refl.evidence = evTa.value; debouncedSave(); },
    }, refl.evidence);
    const quoteIn = el("input", {
      type: "text", placeholder: "Optional: a quote from someone in the community", maxlength: "200", disabled: locked,
      oninput: () => { refl.quote = quoteIn.value; debouncedSave(); },
      value: refl.quote,
    });

    stack.append(
      el("div", { class: "timecapsule reveal" },
        el("p", { class: "eyebrow", style: "color:var(--terra-deep)" }, "At the start of the year, you said:"),
        el("blockquote", {}, `“${project.outcome}”`),
        el("div", { class: "stack no-print", style: "margin-top:14px" },
          el("label", { class: "field" }, el("span", {}, "A year later — how did it go?"), withCounter(evTa)),
          locked ? null : voiceButton(evTa),
          quoteIn
        ),
        refl.evidence
          ? el("div", { class: "stack", style: "margin-top:12px" },
              el("p", { class: "field-label" }, "Our reflection"),
              el("p", { style: "font-size:0.95rem" }, refl.evidence),
              refl.quote ? el("p", { style: "font-style:italic;color:var(--terra-deep)" }, `“${refl.quote}”`) : null
            )
          : null
      )
    );
  }

  /* narrative — a full year report once 12 months are in, otherwise a
     progress snapshot that ignores the (still-locked) time-capsule inputs */
  const fullYear = capsuleReady;
  const narrCard = el("div", { class: "card reveal" },
    el("h3", {}, fullYear ? "Report narrative" : "Progress update"));
  if (refl.narrative) {
    narrCard.append(el("p", { style: "margin-top:10px" }, md(refl.narrative)));
  }
  if (hasKey() && !locked) {
    if (!fullYear) {
      narrCard.append(
        el("p", { class: "small", style: "margin-top:8px" },
          "Dot writes from your numbers so far. Your full year report and time capsule open once all 12 months are in.")
      );
    }
    const genBtn = el("button", {
      class: "btn btn--terra btn--small no-print", style: "margin-top:12px",
      onclick: async () => {
        if (!anyData) return toast("Track some months first — Dot writes from your totals");
        busy(genBtn, true, "Dot is writing…");
        try {
          refl.narrative = await draftAnnualNarrative(
            project, year, rows,
            fullYear ? refl.evidence : "",
            { fullYear, monthsTracked }
          );
          save();
          toast("Dot's draft is ready");
          state.rerender();
        } catch {
          toast("Dot couldn't get through right now — try again in a moment");
          busy(genBtn, false);
        }
      },
    }, dotAvatar(true),
      fullYear
        ? (refl.narrative ? "Ask Dot to redraft it" : "Ask Dot to write it")
        : (refl.narrative ? "Ask Dot to redraft the update" : "Ask Dot for a progress update"));
    narrCard.append(genBtn);
  }
  stack.append(narrCard);

  /* exports */
  stack.append(
    el("div", { class: "stack no-print reveal" },
      el("button", {
        class: "btn btn--primary btn--block",
        onclick: () => window.print(),
      }, "⬇ Save as PDF"),
      el("button", {
        class: "btn btn--ghost btn--block",
        onclick: () => {
          download(`${project.name.replace(/\W+/g, "_")}_${year}.csv`, toCsv(rows, year));
          toast("CSV downloaded");
        },
      }, "⬇ Download data (CSV)")
    )
  );
}

/* year chips with data-coverage dots: none / some / most / full */
function yearStrip(project, state) {
  const years = new Set([currentYear()]);
  if (project.startMonth) years.add(Number(project.startMonth.slice(0, 4)));
  for (const k of Object.keys(project.months)) years.add(Number(k.slice(0, 4)));
  const sorted = [...years].sort((a, b) => b - a).slice(0, 4);

  return el("div", { class: "year-strip" },
    ...sorted.map((y) => {
      const cov = yearCoverage(project, y);
      const covCls = cov === 0 ? "" : cov === 12 ? "cov--full" : cov >= 6 ? "cov--most" : "cov--some";
      return el("button", {
        class: `year-chip${y === state.reportYear ? " selected" : ""}`,
        title: cov === 0 ? "No data yet" : `${cov} of 12 months have data`,
        onclick: () => { state.reportYear = y; state.rerender(); },
      },
        el("span", { class: `cov ${covCls}` }),
        String(y)
      );
    })
  );
}

function defaultYear(project) {
  // prefer the most recent year that actually has data
  const dataYears = Object.keys(project.months).map((k) => Number(k.slice(0, 4)));
  return dataYears.length ? Math.max(...dataYears) : currentYear();
}

/* 12-bar mini chart, scaled to that indicator's own max */
function sparkline(monthly) {
  const max = Math.max(...monthly.map((v) => v || 0), 1);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 122 30");
  svg.setAttribute("class", "spark-svg");
  svg.setAttribute("preserveAspectRatio", "none");
  monthly.forEach((v, i) => {
    const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const h = v === null || v === 0 ? 2 : Math.max(3, (v / max) * 26);
    r.setAttribute("x", String(i * 10 + 1));
    r.setAttribute("y", String(28 - h));
    r.setAttribute("width", "8");
    r.setAttribute("height", String(h));
    r.setAttribute("rx", "1.5");
    if (v === null || v === 0) r.setAttribute("class", "faint");
    svg.append(r);
  });
  return svg;
}

function coverageLine(project, year) {
  const cov = yearCoverage(project, year);
  return `Based on ${cov} tracked month${cov === 1 ? "" : "s"} in ${year}.`;
}

function toCsv(rows, year) {
  const head = ["Indicator", "Unit", ...MONTHS.map((m) => `${m} ${year}`), "Total"];
  const lines = rows.map((r) => [
    `"${r.descriptor.replace(/"/g, '""')}"`,
    r.unit,
    ...r.monthly.map((v) => (v === null ? "" : v)),
    r.total,
  ].join(","));
  return [head.join(","), ...lines].join("\n");
}
