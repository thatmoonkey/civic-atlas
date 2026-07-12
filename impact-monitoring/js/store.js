// Local-device persistence for the CA M&E prototype.
// Anonymous single user; Supabase migration planned later (build brief §6.11).

const KEY = "ca_mne_v1";

export const PLAN_LIMITS = {
  // trackMonths: how long the visible tracking window is.
  // trackable: how many of those months a signed-in account may fill in.
  free: { projects: 1, activities: 5, trackMonths: 12, trackable: 3 },
  paid: { projects: 8, activities: 10, trackMonths: 36, trackable: 36 },
};

const uid = () => Math.random().toString(36).slice(2, 10);

function thisMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function addMonthsKey(key, n) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function exampleProject() {
  // Seeded Park Cleanup Committee case (design brief persona), Jan–Jun 2026 data.
  const acts = [
    { label: "Hold community cleanup days in the park", descriptor: "Cleanup events held", unit: "events", values: [1, 1, 2, 1, 1, 2] },
    { label: "Recruit volunteers for each cleanup", descriptor: "Volunteers who took part", unit: "people", values: [12, 15, 22, 18, 20, 26] },
    { label: "Collect and remove litter from the park", descriptor: "Trash collected", unit: "kg", values: [85, 110, 160, 120, 140, 190] },
    { label: "Meet with the ward councillor about park upkeep", descriptor: "Councillor meetings held", unit: "meetings", values: [1, 0, 1, 1, 0, 1] },
    { label: "Post awareness updates on community social media", descriptor: "Awareness posts published", unit: "posts", values: [4, 6, 8, 5, 7, 9] },
  ];
  const activities = acts.map((a) => ({
    id: uid(),
    label: a.label,
    indicator: { descriptor: a.descriptor, unit: a.unit },
  }));
  const months = {};
  acts.forEach((a, i) => {
    a.values.forEach((v, m) => {
      const key = `2026-${String(m + 1).padStart(2, "0")}`;
      months[key] = months[key] || {};
      months[key][activities[i].id] = v;
    });
  });
  return {
    id: uid(),
    kind: "example",
    wrapped: true,
    name: "Park Cleanup Committee",
    emoji: "🌳",
    photo: null,
    named: true,
    vision: "A clean, safe, accessible Harmony Park that acts as a green hub for our community in Cape Town.",
    toc: "If local residents take part in regular, visible care of Harmony Park, then the park will become cleaner, safer and more welcoming — and a shared sense of local stewardship will grow.",
    outcome: "By the end of the year, the park is noticeably cleaner and better used — families and visitors return, and the community feels real ownership of the space.",
    activities,
    months,
    startMonth: "2026-01",
    reflections: {
      2026: {
        evidence: "We ran cleanups every month and the difference is obvious — the park looks and feels different. Regulars now stop us to say thanks, and a few have joined as volunteers themselves.",
        quote: "I bring my kids here again now — it actually feels safe. — Nomvula, resident",
        narrative: "This year, we really felt our vision for Harmony Park come alive. We held **8 cleanup events**, bringing together **113 dedicated volunteers** who collected a massive 805 kg of trash. It was wonderful to see so many local residents actively caring for the park, showing that local stewardship is truly growing.\n\nThese regular efforts made a real difference. The park is **noticeably cleaner**, and we've seen **more families enjoying the space** once again. We also worked to strengthen our community connections, holding 4 meetings with local councillors and sharing 39 awareness posts to keep everyone informed and involved.\n\nLooking back, we are so proud of what we achieved together. We've seen a **real sense of community ownership** flourish in Harmony Park, moving us closer to our dream of it becoming a vibrant green hub for Cape Town. Thank you to everyone who made this year a success.",
      },
    },
    setupDone: true,
    createdAt: "2026-01-05",
  };
}

function stokvelProject() {
  // Seeded "Ubuntu Investment Stokvel" case — an informal community savings
  // & investment club (common across South Africa: members pool monthly
  // contributions; the group invests or loans the fund and pays out
  // dividends/loans to members), Jan–Jun 2026 data.
  const acts = [
    { label: "Collect monthly member contributions into the stokvel fund", descriptor: "Funds invested", unit: "R", values: [15000, 15500, 16000, 16000, 16500, 17500] },
    { label: "Hold the monthly stokvel meeting to review the books", descriptor: "Meetings held", unit: "meetings", values: [1, 1, 1, 1, 1, 1] },
    { label: "Approve and pay out member loans or withdrawals", descriptor: "Funds paid out", unit: "R", values: [5000, 8000, 3000, 10000, 4000, 6000] },
    { label: "Recruit new members to join the stokvel", descriptor: "New members joined", unit: "members", values: [0, 1, 0, 2, 0, 1] },
    { label: "Review investment growth with the treasurer", descriptor: "Interest earned", unit: "R", values: [310, 325, 340, 355, 370, 385] },
  ];
  const activities = acts.map((a) => ({
    id: uid(),
    label: a.label,
    indicator: { descriptor: a.descriptor, unit: a.unit },
  }));
  const months = {};
  acts.forEach((a, i) => {
    a.values.forEach((v, m) => {
      const key = `2026-${String(m + 1).padStart(2, "0")}`;
      months[key] = months[key] || {};
      months[key][activities[i].id] = v;
    });
  });
  return {
    id: uid(),
    kind: "example",
    wrapped: true,
    name: "Ubuntu Investment Stokvel",
    emoji: "💰",
    photo: null,
    named: true,
    vision: "A financially resilient stokvel where every member grows their savings and can lean on the group when times are hard.",
    toc: "If members contribute consistently each month and we invest those funds wisely, then the stokvel will build a strong shared fund and members will gain real financial security.",
    outcome: "By the end of the year, our total fund has grown steadily, payouts have supported members through hard times, and new members have joined the group.",
    activities,
    months,
    startMonth: "2026-01",
    reflections: {
      2026: {
        evidence: "Members stayed consistent with contributions even in tough months, and we were able to help two members with emergency payouts when they needed it most. Growing the group has been slower than we hoped, but the people who joined have stayed active.",
        quote: "This stokvel got me through my daughter's school fees when I had nowhere else to turn. — Nthabiseng, member",
        narrative: "This year, our stokvel grew from strength to strength. Members contributed steadily every month, growing our shared fund to **R96,500 collected** across the year. We held **6 monthly meetings** to keep the books transparent and every member informed.\n\nWhen members needed help, we were there. We paid out **R36,000** in loans and withdrawals, supporting people through emergencies and opportunities alike, while still growing our investment — earning **R2,085 in interest** along the way. **4 new members** joined us this year, choosing to trust the group with their savings.\n\nLooking back, we are proud of what this stokvel has become: a place where **ubuntu means real financial security**. Every rand contributed built something bigger than any one of us could alone, and we're looking forward to growing further next year.",
      },
    },
    setupDone: true,
    createdAt: "2026-01-05",
  };
}

function blankProject() {
  return {
    id: uid(),
    kind: "blank",
    wrapped: false,
    name: "",
    emoji: "🌱",
    photo: null,
    named: false,
    vision: "",
    toc: "",
    outcome: "",
    activities: [],
    months: {},
    startMonth: null,
    reflections: {},
    setupDone: false,
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

function freshState() {
  return {
    user: { plan: "free", hideExamples: false },
    projects: [exampleProject(), stokvelProject(), blankProject()],
  };
}

/* Bring forward state saved by earlier prototype versions. */
function migrate(s) {
  if (s.user.hideExamples === undefined) s.user.hideExamples = false;
  for (const p of s.projects) {
    if (p.named === undefined) p.named = p.setupDone || (!!p.name && p.name !== "My Project");
    if (p.photo === undefined) p.photo = null;
    if (!p.reflections) p.reflections = {};
    if (p.startMonth === undefined || (p.setupDone && !p.startMonth)) {
      p.startMonth = p.kind === "example" ? "2026-01" : p.setupDone ? thisMonthKey() : null;
    }
    if (p.name === "My Project" && !p.setupDone) p.name = "";
    if (p.wrapped === undefined) p.wrapped = p.kind === "example";
  }
  // Bring forward the new Stokvel example for anyone who already has state saved.
  if (!s.projects.some((p) => p.kind === "example" && p.name === "Ubuntu Investment Stokvel")) {
    const firstExampleIdx = s.projects.findIndex((p) => p.wrapped);
    s.projects.splice(firstExampleIdx + 1, 0, stokvelProject());
  }
  return s;
}

let state = null;

export function load() {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? migrate(JSON.parse(raw)) : freshState();
  } catch {
    state = freshState();
  }
  save();
  return state;
}

/* Optional mirror (e.g. Supabase push) invoked on every save; wired in app.js
   to avoid a circular import. */
let saveHook = null;
export function setSaveHook(fn) {
  saveHook = fn;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Could not persist state", e);
  }
  saveHook?.(state);
}

/* Autosave: mutations land in memory immediately; disk write is debounced
   so typing doesn't hammer localStorage. */
let saveTimer = null;
export function debouncedSave(delay = 1200) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, delay);
}

export function getState() {
  return load();
}

export function limits() {
  return PLAN_LIMITS[load().user.plan] || PLAN_LIMITS.free;
}

export function getProject(id) {
  return load().projects.find((p) => p.id === id) || null;
}

/* Dot's wrapped example projects are reference material, not usable slots —
   they don't count against the plan's project cap and can't be deleted. */
function ownedCount() {
  return load().projects.filter((p) => !p.wrapped).length;
}

export function canAddProject() {
  return ownedCount() < limits().projects;
}

export function addProject() {
  if (!canAddProject()) return null;
  const p = blankProject();
  load().projects.push(p);
  save();
  return p;
}

export function canDeleteProject(project) {
  return !project.wrapped;
}

export function deleteProject(id) {
  const s = load();
  const p = s.projects.find((x) => x.id === id);
  if (!p || p.wrapped) return false;
  s.projects = s.projects.filter((x) => x.id !== id);
  save();
  return true;
}

export function canAddActivity(project) {
  return project.activities.length < limits().activities;
}

export function addActivity(project, label = "", descriptor = "", unit = "") {
  if (!canAddActivity(project)) return null;
  const a = { id: uid(), label, indicator: { descriptor, unit } };
  project.activities.push(a);
  save();
  return a;
}

export function removeActivity(project, actId) {
  project.activities = project.activities.filter((a) => a.id !== actId);
  for (const m of Object.values(project.months)) delete m[actId];
  save();
}

export function setMonthValue(project, monthKey, actId, value) {
  project.months[monthKey] = project.months[monthKey] || {};
  if (value === "" || value === null || Number.isNaN(value)) {
    delete project.months[monthKey][actId];
    if (!Object.keys(project.months[monthKey]).length) delete project.months[monthKey];
  } else {
    project.months[monthKey][actId] = Number(value);
  }
  save();
}

export function monthHasData(project, monthKey) {
  return !!project.months[monthKey] && Object.keys(project.months[monthKey]).length > 0;
}

/* The tracking window: N consecutive months from startMonth (N per plan). */
export function periodMonths(project) {
  if (!project.startMonth) return [];
  const n = limits().trackMonths;
  const out = [];
  for (let i = 0; i < n; i++) out.push(addMonthsKey(project.startMonth, i));
  return out;
}

export function annualTotals(project, year) {
  // { actId: { total, monthly: [12 values or null] } }
  const out = {};
  for (const a of project.activities) {
    const monthly = [];
    let total = 0;
    for (let m = 1; m <= 12; m++) {
      const key = `${year}-${String(m).padStart(2, "0")}`;
      const v = project.months[key]?.[a.id];
      monthly.push(v ?? null);
      if (typeof v === "number") total += v;
    }
    out[a.id] = { total, monthly };
  }
  return out;
}

/* How much of a calendar year has data: 0..12 months. */
export function yearCoverage(project, year) {
  let n = 0;
  for (let m = 1; m <= 12; m++) {
    if (monthHasData(project, `${year}-${String(m).padStart(2, "0")}`)) n++;
  }
  return n;
}

export function setupProgress(project) {
  // 4 setup stages: vision, one-year goal (outcome), activities, indicators
  let done = 0;
  if (project.vision.trim()) done++;
  if (project.outcome.trim()) done++;
  if (project.activities.length > 0 && project.activities.every((a) => a.label.trim())) done++;
  if (
    project.activities.length > 0 &&
    project.activities.every((a) => a.indicator.descriptor.trim() && a.indicator.unit.trim())
  ) done++;
  return { done, total: 4 };
}

/* Adopt the cloud copy after sign-in. Remote wins; local projects the remote
   hasn't seen yet (started on this device before logging in) are kept. */
export function mergeRemote(remote) {
  const local = load();
  if (!remote || !Array.isArray(remote.projects)) {
    save(); // nothing in the cloud yet — push what we have
    return;
  }
  const remoteIds = new Set(remote.projects.map((p) => p.id));
  const extras = local.projects.filter(
    (p) => !p.wrapped && !remoteIds.has(p.id) && (p.named || p.vision.trim() || p.activities.length)
  );
  state = migrate({ ...remote, projects: [...remote.projects, ...extras] });
  save();
}

export function resetAll() {
  state = freshState();
  save();
  return state;
}
