import { el, toast } from "../ui.js";
import { getState, limits, setupProgress, canAddProject, canDeleteProject, addProject, deleteProject } from "../store.js";

export function renderHome(root, navigate) {
  const state = getState();
  const lim = limits();
  const ownedCount = state.projects.filter((p) => !p.wrapped).length;
  const visible = state.projects.filter((p) => !(p.wrapped && state.user.hideExamples));

  root.append(
    el("header", { class: "masthead" },
      el("a", { class: "brand", href: "/", title: "About Civic Atlas" },
        el("img", { class: "brand-lockup", src: "img/ca-wide.svg", alt: "Civic Atlas" })
      ),
      el("button", {
        class: "btn--icon btn", "aria-label": "Settings",
        onclick: () => navigate("#/settings"),
      }, "⚙")
    )
  );

  root.append(
    el("div", { class: "stack" },
      el("div", { class: "reveal" },
        el("p", { class: "eyebrow" }, "Your projects"),
        el("h1", {}, "Track the change you're making."),
        el("p", { class: "lede", style: "margin-top:8px" },
          "Plan what you'll do, count it monthly, and hand your funder a report they'll actually read.")
      ),
      ...visible.map((p) => projectCard(p, navigate)),
      addCard(navigate, lim, ownedCount)
    )
  );
}

function projectCard(p, navigate) {
  const prog = setupProgress(p);
  const pct = Math.round((prog.done / prog.total) * 100);
  const monthsTracked = Object.keys(p.months).length;

  const badge =
    p.kind === "example"
      ? el("span", { class: "badge badge--example" }, "Example")
      : prog.done === prog.total
        ? el("span", { class: "badge badge--live" }, "Tracking")
        : el("span", { class: "badge badge--new" }, "Set up");

  const tagline =
    p.kind === "example"
      ? "A worked example — browse it to see how the flow fits together."
      : prog.done === prog.total
        ? `${monthsTracked} month${monthsTracked === 1 ? "" : "s"} tracked · ${p.activities.length} activities`
        : `Setup ${prog.done} of ${prog.total} steps done`;

  return el("article", {
    class: "card card--action project-card reveal",
    onclick: () => navigate(`#/p/${p.id}`),
  },
    el("div", { class: "row" },
      p.photo
        ? el("img", { class: "project-thumb", src: p.photo, alt: "" })
        : el("div", { class: "project-emoji" }, p.emoji || "🌱"),
      el("div", { class: "grow" },
        el("div", { class: "row row--between" }, el("h3", {}, p.name || "New project"), badge),
        el("p", { class: "tagline" }, tagline)
      ),
      canDeleteProject(p)
        ? el("button", {
            class: "btn--icon btn", style: "width:34px;height:34px;font-size:0.9rem;flex:none",
            "aria-label": `Delete ${p.name || "project"}`,
            onclick: (e) => {
              e.stopPropagation();
              if (confirm(`Delete "${p.name || "this project"}"? This can't be undone.`)) {
                deleteProject(p.id);
                toast("Project deleted");
                navigate("#/");
              }
            },
          }, "🗑")
        : null
    ),
    p.kind !== "example" && prog.done < prog.total
      ? el("div", { class: "meter" }, el("i", { style: `width:${pct}%` }))
      : null
  );
}

function addCard(navigate, lim, ownedCount) {
  if (canAddProject()) {
    return el("article", {
      class: "card card--action card--locked reveal",
      onclick: () => {
        const p = addProject();
        if (p) navigate(`#/p/${p.id}`);
      },
    },
      el("div", { class: "row" },
        el("div", { class: "project-emoji", style: "background:transparent;border-style:dashed" }, "＋"),
        el("div", { class: "grow" },
          el("h3", { style: "color:var(--ink-soft)" }, "New project"),
          el("p", { class: "small" }, `${ownedCount} of ${lim.projects} projects used`)
        )
      )
    );
  }
  return el("article", { class: "card card--locked reveal" },
    el("div", { class: "row" },
      el("div", { class: "project-emoji", style: "background:transparent;border-style:dashed" }, "🔒"),
      el("div", { class: "grow" },
        el("h3", { style: "color:var(--ink-soft)" }, "More projects"),
        el("p", { class: "small" }, "The paid plan runs up to 8 projects with 10 activities each. Coming soon.")
      )
    )
  );
}
