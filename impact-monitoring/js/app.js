import { el, openSheet, pickPhoto, toast, lookPicker, projectTile } from "./ui.js";
import { load, save, getProject, setupProgress, setSaveHook, mergeRemote } from "./store.js";
import { initAuth, isSignedIn, fetchRemoteState, pushRemoteState } from "./supabase.js";
import { renderHome } from "./views/home.js";
import { renderSetup } from "./views/setup.js";
import { renderTrack } from "./views/track.js";
import { renderReport } from "./views/report.js";
import { renderSettings } from "./views/settings.js";
import { renderAuthGate } from "./views/auth.js";

load();
setSaveHook(pushRemoteState);

const root = document.getElementById("app");

// per-session UI state (selected month/year etc.)
const session = { trackMonth: null, reportYear: null, rerender: render };

function navigate(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

function projectHeader(project) {
  return el("header", { class: "masthead no-print" },
    el("a", { class: "back-link", href: "#/" }, "← Projects"),
    el("div", { class: "row", style: "gap:8px" },
      projectTile(project, "tile--mast"),
      el("strong", { style: "font-family:var(--font-display);font-size:1rem" }, project.name || "New project"),
      project.named && !project.wrapped
        ? el("button", {
            class: "btn--icon btn", style: "width:32px;height:32px;font-size:0.85rem", "aria-label": "Edit project look & name",
            onclick: () => openProjectEditSheet(project),
          }, "✎")
        : null
    )
  );
}

/* edit name, look (emoji + colour) & photo later (design ask: editable anytime) */
function openProjectEditSheet(project) {
  const nameInput = el("input", { type: "text", value: project.name, maxlength: "60" });
  const picker = lookPicker(project, () => {});
  const photoSlot = el("div", {});
  const drawPhoto = () => {
    photoSlot.innerHTML = "";
    if (project.photo) {
      photoSlot.append(
        el("img", { class: "photo-preview", src: project.photo, alt: "Project photo" }),
        el("button", {
          class: "link-btn", style: "margin-top:6px",
          onclick: () => { project.photo = null; drawPhoto(); },
        }, "Remove photo")
      );
    } else {
      photoSlot.append(
        el("button", {
          class: "btn btn--ghost btn--block",
          onclick: () => pickPhoto((dataUrl) => { project.photo = dataUrl; drawPhoto(); }),
        }, "📷 …or use a photo instead")
      );
    }
  };
  drawPhoto();

  const close = openSheet(
    el("div", { class: "stack" },
      el("h2", {}, "Name & look"),
      el("label", { class: "field" }, el("span", {}, "Project name"), nameInput),
      picker,
      photoSlot,
      el("button", {
        class: "btn btn--primary btn--block",
        onclick: () => {
          if (!nameInput.value.trim()) return toast("The project needs a name");
          project.name = nameInput.value.trim();
          save();
          close();
          render();
        },
      }, "Done")
    )
  );
}

function projectTabs(project, tab) {
  const mk = (id, icon, label) =>
    el("button", {
      class: `tab${tab === id ? " active" : ""}`,
      onclick: () => navigate(`#/p/${project.id}${id === "plan" ? "" : "/" + id}`),
    }, icon, " ", label);
  return el("nav", { class: "tabbar no-print" },
    el("div", { class: "tabbar-inner" },
      mk("plan", "🗺", "Plan"),
      mk("track", "✏️", "Track"),
      mk("report", "📄", "Report")
    )
  );
}

let lastRoute = null;

function render() {
  const scrollY = window.scrollY;
  root.innerHTML = "";
  const hash = location.hash || "#/";
  const parts = hash.slice(2).split("/").filter(Boolean); // e.g. ["p", id, "track"]

  if (parts[0] === "settings") {
    renderSettings(root, navigate);
  } else if (parts[0] === "p" && parts[1]) {
    const project = getProject(parts[1]);
    if (!project) { navigate("#/"); return; }

    const prog = setupProgress(project);
    const ready = project.setupDone || prog.done === prog.total;
    let tab = parts[2] || "plan";
    if (!ready && tab !== "plan") tab = "plan"; // gate track/report until setup completes

    root.append(projectHeader(project));
    const body = el("main", {});
    root.append(body);

    // Track & Report need an account; the plan is open to anonymous users.
    const needsAccount = (tab === "track" || tab === "report") && !project.wrapped && !isSignedIn();

    if (needsAccount) renderAuthGate(body, render);
    else if (tab === "track") renderTrack(body, project, session);
    else if (tab === "report") renderReport(body, project, session);
    else renderSetup(body, project, navigate, render);

    if (ready) root.append(projectTabs(project, tab));
  } else {
    renderHome(root, navigate);
  }

  // Keep scroll position on same-route rerenders (adding an activity,
  // Dot generating, etc.); only jump to top on real navigation.
  if (hash === lastRoute) {
    requestAnimationFrame(() => window.scrollTo(0, scrollY));
  } else {
    window.scrollTo(0, 0);
  }
  lastRoute = hash;
}

window.addEventListener("hashchange", render);
render(); // first paint from local state — auth resolves just behind it

initAuth(render).then(async (session) => {
  if (session) {
    mergeRemote(await fetchRemoteState());
  }
  render();
});

// PWA: best-effort — requires HTTPS or localhost; harmless elsewhere.
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
