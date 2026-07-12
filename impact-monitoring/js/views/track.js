import { el, toast, monthLabel, currentMonthKey, openSheet } from "../ui.js";
import { save, limits, getState, setMonthValue, monthHasData, periodMonths } from "../store.js";

// Monthly tracking sheet — the two-minute fill-in (design brief step 5).
// The window is `trackMonths` consecutive months starting at
// project.startMonth. Free accounts can fill in the first `trackable`
// months (3); later months unlock with the paid plan.

export function renderTrack(root, project, state) {
  if (!project.startMonth) {
    project.startMonth = currentMonthKey();
    save();
  }
  const period = periodMonths(project);
  const viewOnly = project.wrapped;
  // wrapped examples are demos: show all their data, no paywall chrome
  const trackableCount = viewOnly ? period.length : limits().trackable;
  const isLocked = (key) => period.indexOf(key) >= trackableCount;

  if (!period.includes(state.trackMonth)) {
    state.trackMonth = period.includes(currentMonthKey()) ? currentMonthKey() : period[0];
  }

  root.append(
    el("div", { class: "reveal" },
      el("p", { class: "eyebrow" }, "Monthly tracking"),
      el("h1", {}, "How did the month go?"),
      el("p", { class: "lede", style: "margin-top:8px" }, "Just the numbers — two minutes, once a month."),
      viewOnly
        ? el("p", { class: "small", style: "margin-top:6px" }, "Example project — browse the numbers, but they're locked.")
        : el("p", { class: "small", style: "margin-top:6px" },
            `Month 1 is ${monthLabel(period[0])} · `,
            el("button", { class: "link-btn", onclick: () => openStartMonthSheet(project, state) }, "change")
          )
    )
  );

  // month chips across the tracking window
  const strip = el("div", { class: "month-strip reveal", style: "margin-top:12px" });
  for (const key of period) {
    strip.append(
      el("button", {
        class: `month-chip${key === state.trackMonth ? " selected" : ""}`,
        onclick: () => { state.trackMonth = key; state.rerender(); },
      },
        monthLabel(key, true),
        isLocked(key) ? el("span", {}, "🔒") : monthHasData(project, key) ? el("span", { class: "dot" }) : null
      )
    );
  }
  root.append(strip);
  requestAnimationFrame(() => strip.querySelector(".selected")?.scrollIntoView({ inline: "center", block: "nearest" }));

  // the sheet — or the paywall teaser for locked months
  if (isLocked(state.trackMonth)) {
    root.append(
      el("div", { class: "card reveal", style: "margin-top:12px;text-align:center" },
        el("h3", {}, `${monthLabel(state.trackMonth)} is locked`),
        el("p", { class: "small", style: "margin:10px 0 0" },
          `Your free account covers the first ${trackableCount} months of tracking. The paid plan carries on from month ${trackableCount + 1} — coming soon.`)
      )
    );
  } else {
    const sheet = el("div", { class: "card reveal", style: "margin-top:12px" },
      el("div", { class: "row row--between", style: "margin-bottom:6px" },
        el("h3", {}, monthLabel(state.trackMonth)),
        monthHasData(project, state.trackMonth) ? el("span", { class: "badge badge--live" }, "Saved") : null
      ),
      ...project.activities.map((a) => {
        const val = project.months[state.trackMonth]?.[a.id];
        const input = el("input", {
          type: "number", inputmode: "decimal", min: "0", placeholder: "—",
          value: val ?? "",
          disabled: viewOnly,
          onchange: () => {
            setMonthValue(project, state.trackMonth, a.id, input.value === "" ? "" : Number(input.value));
            toast("Saved ✓");
            state.rerender();
          },
        });
        return el("div", { class: "track-row" },
          el("div", {},
            el("div", { class: "desc" }, a.indicator.descriptor || a.label),
            el("div", { class: "unit" }, a.indicator.unit)
          ),
          input
        );
      })
    );
    root.append(sheet);

    // explicit forward affordance — values already autosave on blur, but
    // there's no obvious way to move on without this (client feedback).
    if (!viewOnly) {
      const idx = period.indexOf(state.trackMonth);
      const nextKey = period[idx + 1];
      if (nextKey) {
        root.append(
          el("button", {
            class: "btn btn--primary btn--block reveal", style: "margin-top:12px",
            onclick: () => { state.trackMonth = nextKey; state.rerender(); },
          }, `Saved ✓ — next: ${monthLabel(nextKey, true)} →`)
        );
      }
    }
  }

  if (!viewOnly) {
    const filled = period.filter((k) => monthHasData(project, k)).length;
    root.append(
      el("p", { class: "small reveal", style: "text-align:center;margin-top:14px" },
        filled
          ? `${filled} month${filled === 1 ? "" : "s"} captured so far.`
          : "Values save automatically — pick a month and start counting."),
      getState().user.plan === "free"
        ? el("p", { class: "small reveal", style: "text-align:center;margin-top:4px" },
            `Free accounts track ${limits().trackable} months — the paid plan keeps going.`)
        : null
    );
  }
}

function openStartMonthSheet(project, state) {
  const inp = el("input", { type: "month", value: project.startMonth });
  const close = openSheet(
    el("div", { class: "stack" },
      el("h2", {}, "When does month 1 start?"),
      el("p", { class: "small" },
        "Your tracking period starts here. Numbers you've already entered stay attached to their real months."),
      inp,
      el("button", {
        class: "btn btn--primary btn--block",
        onclick: () => {
          if (!/^\d{4}-\d{2}$/.test(inp.value)) return toast("Pick a month first");
          project.startMonth = inp.value;
          save();
          state.trackMonth = null;
          close();
          state.rerender();
          toast(`Month 1 is now ${monthLabel(inp.value)}`);
        },
      }, "Set start month")
    )
  );
}
