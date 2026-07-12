import { el, toast, busy, dotSays, dotAvatar, withCounter, voiceButton, openSheet, pickPhoto, currentMonthKey } from "../ui.js";
import { save, debouncedSave, limits, canAddActivity, addActivity, removeActivity, setupProgress } from "../store.js";
import { hasKey, draftTheoryOfChange, suggestActivities, suggestIndicators } from "../gemini.js";

// Setup flow: name & photo page → clean Dot vision page → journey
// (ToC → activities → indicators). Everything autosaves; only the step
// currently being filled in shows a continue button.

const UNIT_PRESETS = ["people", "events", "kg", "meetings", "posts", "visitors", "bags", "hours", "R", "$"];

export function renderSetup(root, project, navigate, rerender) {
  if (!project.setupDone) {
    if (!project.named) return renderNamePage(root, project, rerender);
    if (!project.vision.trim()) return renderVisionPage(root, project, rerender);
  }
  renderJourney(root, project, navigate, rerender);
}

/* ------------------------------------------------------------------
   page 0 — name & photo
   ------------------------------------------------------------------ */
function renderNamePage(root, project, rerender) {
  const nameInput = el("input", {
    type: "text", value: project.name, placeholder: "e.g. Park Cleanup Committee", maxlength: "60",
    oninput: () => { project.name = nameInput.value; debouncedSave(); },
  });

  const photoSlot = el("div", {});
  const drawPhoto = () => {
    photoSlot.innerHTML = "";
    if (project.photo) {
      photoSlot.append(
        el("img", { class: "photo-preview", src: project.photo, alt: "Project photo" }),
        el("button", {
          class: "link-btn", style: "margin-top:6px",
          onclick: () => { project.photo = null; save(); drawPhoto(); },
        }, "Remove photo")
      );
    } else {
      photoSlot.append(
        el("button", {
          class: "btn btn--ghost btn--block",
          onclick: () => pickPhoto((dataUrl) => { project.photo = dataUrl; save(); drawPhoto(); }),
        }, "📷 Add or take a photo (optional)")
      );
    }
  };
  drawPhoto();

  root.append(
    el("div", { class: "reveal" },
      dotSays("A new project! First things first — what's it called? A photo helps too: something that shows what this is all about.", true)
    ),
    el("div", { class: "stack reveal", style: "margin-top:18px" },
      el("label", { class: "field" }, el("span", {}, "Project name"), nameInput),
      photoSlot,
      el("button", {
        class: "btn btn--primary btn--block",
        onclick: () => {
          if (!nameInput.value.trim()) return toast("Give your project a name first");
          project.name = nameInput.value.trim();
          project.named = true;
          save();
          rerender();
        },
      }, "Continue →")
    )
  );
}

/* ------------------------------------------------------------------
   page 1 — the clean vision page, just Dot and a box
   ------------------------------------------------------------------ */
function renderVisionPage(root, project, rerender) {
  const ta = el("textarea", {
    placeholder: "e.g. A clean, safe park that the whole neighbourhood uses and cares for.",
    style: "min-height:110px",
    oninput: () => { project.vision = ta.value; debouncedSave(); },
  }, project.vision);

  root.append(
    el("div", { class: "reveal" },
      dotSays("Let's start with the big picture. In a sentence or two: what's the change you want to see? Don't overthink it — say it like you'd say it to a neighbour.", true)
    ),
    el("div", { class: "stack reveal", style: "margin-top:18px" },
      withCounter(ta),
      voiceButton(ta),
      el("button", {
        class: "btn btn--primary btn--block",
        onclick: () => {
          if (!ta.value.trim()) return toast("Tell Dot your big picture first");
          project.vision = ta.value.trim();
          save();
          rerender();
        },
      }, "Continue to Theory of Change →")
    )
  );
}

/* ------------------------------------------------------------------
   the journey — remaining steps, one live CTA at a time
   ------------------------------------------------------------------ */
function renderJourney(root, project, navigate, rerender) {
  const stageDone = [
    !!project.vision.trim(),
    !!(project.toc.trim() && project.outcome.trim()),
    project.activities.length > 0 && project.activities.every((a) => a.label.trim()),
    project.activities.length > 0 && project.activities.every((a) => a.indicator.descriptor.trim() && a.indicator.unit.trim()),
  ];
  const active = stageDone.indexOf(false); // -1 when all done

  root.append(
    el("div", { class: "reveal" },
      el("p", { class: "eyebrow" }, "Project setup"),
      el("h1", {}, project.setupDone ? "Your plan" : "Nearly there."),
      el("p", { class: "lede", style: "margin-top:8px" },
        project.setupDone
          ? "This is the plan behind your tracking. Tap any step to adjust it — changes save on their own."
          : "Dot drafts, you decide. Changes save on their own.")
    )
  );

  if (project.wrapped) {
    root.append(
      el("div", { class: "callout reveal", style: "margin-top:14px" },
        "This is one of Dot's worked examples — browse it freely, but it's locked from editing and from Dot's drafting tools. Start your own project to try those."
      )
    );
  }

  const journey = el("div", { class: "journey", style: "margin-top:20px" });
  root.append(journey);

  const steps = [
    { title: "Your vision", hint: "The big picture, in a sentence or two.", panel: visionPanel },
    { title: "Theory of change", hint: "If we do this, then that will change.", panel: tocPanel },
    { title: "Activities", hint: `What you'll actually do — up to ${limits().activities}.`, panel: activitiesPanel },
    { title: "Monthly numbers", hint: "One simple number per activity.", panel: indicatorsPanel },
  ];

  steps.forEach((s, i) => {
    const isDone = stageDone[i];
    // showCTA: only the step currently being worked on gets a continue button
    const showCTA = !project.setupDone && i === active;
    const isOpen = project.setupDone || isDone || i === active;
    const cls = ["step", isDone && "step--done", !isDone && i === active && "step--active", !isOpen && "step--locked"]
      .filter(Boolean).join(" ");

    const body = el("div", { class: "step-body" },
      el("h3", {}, s.title),
      el("p", { class: "hint" }, s.hint)
    );
    if (isOpen) body.append(el("div", { class: "step-panel" }, s.panel(project, rerender, navigate, showCTA)));

    journey.append(
      el("div", { class: cls },
        el("div", { class: "step-stamp" }, isDone ? el("span", { class: "tick" }, "✓") : String(i + 1)),
        body
      )
    );
  });

  if (active === -1 && !project.setupDone) {
    root.append(
      el("button", {
        class: "btn btn--terra btn--block reveal", style: "margin-top:10px",
        onclick: () => {
          project.setupDone = true;
          project.startMonth = project.startMonth || currentMonthKey();
          save();
          toast("Plan locked in — time to track 🎉");
          navigate(`#/p/${project.id}/track`);
        },
      }, "Finish setup & start tracking →")
    );
  }
}

/* step 1 — vision (journey version, editable) */
function visionPanel(project, rerender, navigate, showCTA) {
  const locked = project.wrapped;
  const ta = el("textarea", {
    placeholder: "e.g. A clean, safe park that the whole neighbourhood uses and cares for.",
    disabled: locked,
    oninput: () => { project.vision = ta.value; debouncedSave(); },
  }, project.vision);
  return el("div", { class: "stack" },
    withCounter(ta),
    locked ? null : voiceButton(ta),
    showCTA
      ? el("button", {
          class: "btn btn--primary btn--small",
          onclick: () => {
            if (!ta.value.trim()) return toast("Give it a sentence first");
            project.vision = ta.value.trim();
            save();
            rerender();
          },
        }, "That's my vision →")
      : null
  );
}

/* step 2 — theory of change + outcome */
function tocPanel(project, rerender, navigate, showCTA) {
  const locked = project.wrapped;
  const stack = el("div", { class: "stack" });

  const tocTa = el("textarea", {
    placeholder: "If we ..., then ...",
    disabled: locked,
    oninput: () => { project.toc = tocTa.value; debouncedSave(); },
  }, project.toc);
  const outTa = el("textarea", {
    placeholder: "By the end of the year, ...",
    style: "min-height:72px",
    disabled: locked,
    oninput: () => { project.outcome = outTa.value; debouncedSave(); },
  }, project.outcome);

  if (hasKey() && !locked) {
    const genBtn = el("button", {
      class: "btn btn--terra btn--small",
      onclick: async () => {
        const seed = project.vision || project.name;
        busy(genBtn, true, "Drafting…");
        try {
          const d = await draftTheoryOfChange(seed);
          tocTa.value = project.toc = d.toc;
          outTa.value = project.outcome = d.outcome;
          save();
          toast("Dot's draft is in — edit it until it sounds like you");
        } catch {
          toast("Dot couldn't get through right now — try again in a moment");
        }
        busy(genBtn, false);
      },
    }, dotAvatar(true), "Ask Dot to draft it");
    stack.append(genBtn);
  }

  stack.append(
    el("div", { class: `draft${locked ? " draft--locked" : ""}` }, tocTa),
    el("label", { class: "field" },
      el("span", {}, "Outcome to check in a year"),
      el("div", { class: `draft${locked ? " draft--locked" : ""}` }, outTa)
    ),
    showCTA
      ? el("button", {
          class: "btn btn--primary btn--small",
          onclick: () => {
            if (!tocTa.value.trim() || !outTa.value.trim()) return toast("Fill in both parts first");
            project.toc = tocTa.value.trim();
            project.outcome = outTa.value.trim();
            save();
            rerender();
          },
        }, "Sounds right — next →")
      : null
  );
  return stack;
}

/* step 3 — activities (rows open a focused editor sheet) */
function activitiesPanel(project, rerender, navigate, showCTA) {
  const locked = project.wrapped;
  const lim = limits().activities;
  const stack = el("div", { class: "stack" });

  if (hasKey() && !locked && project.activities.length === 0) {
    const genBtn = el("button", {
      class: "btn btn--terra btn--small",
      onclick: async () => {
        busy(genBtn, true, "Suggesting…");
        try {
          const ideas = await suggestActivities(project.toc, lim);
          ideas.forEach((label) => addActivity(project, label));
          toast("Dot's ideas are in — cut what doesn't fit");
          rerender();
        } catch {
          toast("Dot couldn't get through right now — try again in a moment");
          busy(genBtn, false);
        }
      },
    }, dotAvatar(true), "Ask Dot for activity ideas");
    stack.append(genBtn);
  }

  project.activities.forEach((a, i) => {
    stack.append(
      el("div", {
        class: locked ? "activity-row" : "activity-row card--action",
        onclick: locked ? null : () => openActivityEditor(project, a, rerender),
      },
        el("div", { class: "num" }, String(i + 1)),
        el("div", { class: "grow", style: "padding:4px 2px" },
          el("p", { style: "font-weight:700;font-size:0.95rem" }, a.label || "Tap to describe this activity…")
        ),
        locked ? null : el("button", {
          class: "del", "aria-label": "Remove activity",
          onclick: (e) => {
            e.stopPropagation();
            removeActivity(project, a.id);
            rerender();
          },
        }, "✕")
      )
    );
  });

  if (locked) {
    // no add/remove — this is Dot's fixed worked example
  } else if (canAddActivity(project)) {
    stack.append(
      el("button", {
        class: "btn btn--ghost btn--small",
        onclick: () => {
          const a = addActivity(project);
          openActivityEditor(project, a, rerender, true);
        },
      }, "+ Add an activity")
    );
  } else {
    stack.append(el("p", { class: "cap-note" }, `That's the ${lim}-activity limit on the free plan — plenty for a strong report.`));
  }

  if (showCTA && project.activities.length) {
    stack.append(
      el("button", {
        class: "btn btn--primary btn--small",
        onclick: () => {
          if (!project.activities.every((x) => x.label.trim())) return toast("Every activity needs a description — tap to fill it in");
          save();
          rerender();
        },
      }, "That's my activities →")
    );
  }
  return stack;
}

/* focused full-screen editor for a single activity */
function openActivityEditor(project, activity, rerender, isNew = false) {
  const ta = el("textarea", {
    style: "min-height:140px;font-size:1.05rem",
    placeholder: "Describe the activity — what will you actually do, and roughly how often?\n\ne.g. Hold a cleanup morning in the park with volunteers on the first Saturday of every month.",
    oninput: () => { activity.label = ta.value; debouncedSave(); },
  }, activity.label);

  const close = openSheet(
    el("div", { class: "stack" },
      el("div", { class: "row row--between" },
        el("h2", {}, isNew ? "New activity" : "Edit activity"),
        el("button", { class: "btn--icon btn", "aria-label": "Close", onclick: () => done() }, "✕")
      ),
      el("p", { class: "small" }, "Keep it concrete — something you could count happening."),
      withCounter(ta),
      voiceButton(ta),
      el("button", { class: "btn btn--primary btn--block", onclick: () => done() }, "Done")
    ),
    { full: true }
  );

  function done() {
    activity.label = ta.value.trim();
    if (!activity.label && isNew) removeActivity(project, activity.id);
    save();
    close();
    rerender();
  }
}

/* step 4 — indicators, with preset + custom units */
function indicatorsPanel(project, rerender, navigate, showCTA) {
  const locked = project.wrapped;
  const stack = el("div", { class: "stack" });
  const missing = project.activities.some((a) => !a.indicator.descriptor.trim());

  if (!document.getElementById("unit-presets")) {
    document.body.append(
      el("datalist", { id: "unit-presets" }, ...UNIT_PRESETS.map((u) => el("option", { value: u })))
    );
  }

  if (hasKey() && !locked && missing) {
    const genBtn = el("button", {
      class: "btn btn--terra btn--small",
      onclick: async () => {
        busy(genBtn, true, "Matching…");
        try {
          const inds = await suggestIndicators(project.activities);
          project.activities.forEach((a, i) => {
            if (inds[i]) a.indicator = { descriptor: inds[i].descriptor || "", unit: inds[i].unit || "count" };
          });
          save();
          toast("One number per activity — tweak the wording if needed");
          rerender();
        } catch {
          toast("Dot couldn't get through right now — try again in a moment");
          busy(genBtn, false);
        }
      },
    }, dotAvatar(true), "Ask Dot to pick the numbers");
    stack.append(genBtn);
  }

  project.activities.forEach((a) => {
    const desc = el("input", {
      type: "text", value: a.indicator.descriptor, placeholder: "What you'll count", disabled: locked,
      oninput: () => { a.indicator.descriptor = desc.value; debouncedSave(); },
    });
    const unit = el("input", {
      type: "text", value: a.indicator.unit, placeholder: "unit", list: "unit-presets", disabled: locked,
      oninput: () => { a.indicator.unit = unit.value; debouncedSave(); },
    });
    stack.append(
      el("div", { class: "activity-row", style: "flex-direction:column;align-items:stretch" },
        el("p", { class: "small", style: "font-weight:700" }, a.label || "(unnamed activity)"),
        el("div", { class: "indicator-grid" }, desc, unit)
      )
    );
  });

  if (showCTA && project.activities.length) {
    stack.append(
      el("button", {
        class: "btn btn--primary btn--small",
        onclick: () => {
          if (project.activities.some((a) => !a.indicator.descriptor.trim() || !a.indicator.unit.trim()))
            return toast("Each activity needs a descriptor and a unit");
          save();
          rerender();
        },
      }, "Numbers sorted →")
    );
  }
  if (!project.activities.length) {
    stack.append(el("p", { class: "small" }, "Add activities first — each one gets exactly one number to count."));
  }
  return stack;
}
