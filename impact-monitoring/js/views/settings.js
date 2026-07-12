import { el, toast, download, dotAvatar } from "../ui.js";
import { getState, save, resetAll } from "../store.js";
import { currentUser, signOut } from "../supabase.js";

export function renderSettings(root, navigate) {
  const state = getState();

  root.append(
    el("a", { class: "back-link reveal", href: "#/" }, "← Back to projects"),
    el("div", { class: "reveal", style: "margin-top:10px" },
      el("p", { class: "eyebrow" }, "Settings"),
      el("h1", {}, "Your setup")
    )
  );

  const stack = el("div", { class: "stack", style: "margin-top:16px" });
  root.append(stack);

  stack.append(
    el("div", { class: "card reveal" },
      el("div", { class: "row" },
        dotAvatar(),
        el("div", { class: "grow" },
          el("h3", {}, "Dot, your impact guide"),
          el("p", { class: "small" }, "Kind, experienced, allergic to jargon.")
        )
      ),
      el("p", { class: "small", style: "margin:10px 0 0" },
        "Dot drafts your theory of change, activities, monthly numbers and report narrative wherever you see her.")
    )
  );

  /* account */
  const user = currentUser();
  stack.append(
    el("div", { class: "card reveal" },
      el("div", { class: "row row--between" },
        el("h3", {}, "Account"),
        user ? el("span", { class: "badge badge--live" }, "Signed in") : el("span", { class: "badge badge--new" }, "Guest")
      ),
      el("p", { class: "small", style: "margin-top:8px" },
        user
          ? `Signed in as ${user.email}. Your projects and tracking are backed up to your account.`
          : "You're browsing as a guest — planning works without an account, but tracking and reports need one. You'll be asked to sign up when you open Track."),
      user
        ? el("button", {
            class: "btn btn--ghost btn--small", style: "margin-top:12px",
            onclick: async () => {
              await signOut();
              toast("Signed out — your data stays on this device");
              navigate("#/");
            },
          }, "Sign out")
        : null
    )
  );

  /* plan */
  stack.append(
    el("div", { class: "card reveal" },
      el("div", { class: "row row--between" },
        el("h3", {}, "Plan"),
        el("span", { class: "plan-chip" }, state.user.plan === "paid" ? "Paid" : "Free plan")
      ),
      el("p", { class: "small", style: "margin-top:8px" },
        "Free: 1 project of your own, 5 activities, 3 months of tracking — plus Dot's example gallery, which doesn't count against your limit. Paid (coming soon): up to 8 projects, 10 activities, and tracking that keeps going past month 3.")
    )
  );

  /* example gallery toggle */
  const exToggle = el("input", {
    type: "checkbox", class: "switch", "aria-label": "Show example projects",
    checked: !state.user.hideExamples,
    onchange: () => {
      state.user.hideExamples = !exToggle.checked;
      save();
      toast(state.user.hideExamples ? "Examples hidden" : "Examples back on your home screen");
    },
  });
  stack.append(
    el("div", { class: "card reveal" },
      el("div", { class: "row row--between" },
        el("div", { class: "grow" },
          el("h3", {}, "Show example projects"),
          el("p", { class: "small", style: "margin-top:4px" },
            "Dot's worked examples (Park Cleanup, Stokvel) on your home screen.")
        ),
        exToggle
      )
    )
  );

  /* data */
  stack.append(
    el("div", { class: "card reveal" },
      el("h3", {}, "Your data"),
      el("p", { class: "small", style: "margin:6px 0 12px" },
        "Your data lives on this device, and when you're signed in it's also backed up to your account in the cloud. Export it any time. (Self-serve delete is on the roadmap.)"),
      el("div", { class: "stack" },
        el("button", {
          class: "btn btn--ghost btn--small",
          onclick: () => {
            download("ca-mne-data.json", JSON.stringify(getState(), null, 2), "application/json");
            toast("Data exported");
          },
        }, "⬇ Export all data (JSON)"),
        el("button", {
          class: "btn btn--ghost btn--small", style: "color:var(--danger);border-color:var(--danger)",
          onclick: () => {
            if (confirm("Reset everything back to the starter projects? This wipes your local data.")) {
              resetAll();
              toast("Fresh start");
              navigate("#/");
            }
          },
        }, "Reset to starter projects")
      )
    )
  );

  root.append(
    el("p", { class: "small reveal", style: "text-align:center;margin-top:20px" },
      "Civic Atlas Impact Monitoring · prototype · free tier")
  );
}
