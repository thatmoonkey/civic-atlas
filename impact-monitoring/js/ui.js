// Small DOM helpers shared across views.

import { transcribeVoice } from "./gemini.js";

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}

export function dotAvatar(small = false) {
  return el("img", {
    class: `dot-avatar${small ? " dot-avatar--sm" : ""}`,
    src: "img/dot.svg",
    alt: "Dot, your impact guide",
  });
}

export function dotSays(message, big = false) {
  return el("div", { class: `dot-intro${big ? " dot-intro--big" : ""}` },
    dotAvatar(),
    el("div", { class: "dot-bubble" },
      el("span", { class: "dot-name" }, "Dot · your impact guide"),
      message
    )
  );
}

export function toast(msg) {
  const root = document.getElementById("toast-root");
  const t = el("div", { class: "toast" }, msg);
  root.append(t);
  setTimeout(() => t.remove(), 2900);
}

export function busy(btn, on, label) {
  if (on) {
    btn.dataset.markup = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spin"></span> ${label || "Thinking…"}`;
  } else {
    btn.disabled = false;
    if (btn.dataset.markup) btn.innerHTML = btn.dataset.markup;
  }
}

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthKey(year, m1based) {
  return `${year}-${String(m1based).padStart(2, "0")}`;
}

export function addMonths(key, n) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return monthKey(d.getFullYear(), d.getMonth() + 1);
}

export function monthLabel(key, short = false) {
  const [y, m] = key.split("-").map(Number);
  return short ? `${MONTHS[m - 1]} ’${String(y).slice(2)}` : `${MONTHS[m - 1]} ${y}`;
}

export function currentYear() {
  return new Date().getFullYear();
}

export function currentMonthKey() {
  const d = new Date();
  return monthKey(d.getFullYear(), d.getMonth() + 1);
}

export function download(filename, text, type = "text/csv") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = el("a", { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* Lightweight **bold** markdown renderer for Dot's narratives. */
export function md(text, cls = "narrative") {
  const span = el("span", { class: cls });
  String(text).split("**").forEach((part, i) => {
    span.append(i % 2 ? el("strong", {}, part) : part);
  });
  return span;
}

/* Character counter for Dot-facing inputs (all capped at 200 chars). */
export const DOT_INPUT_MAX = 200;

export function withCounter(textarea) {
  textarea.setAttribute("maxlength", String(DOT_INPUT_MAX));
  const note = el("div", { class: "char-note" }, countText(textarea));
  textarea.addEventListener("input", () => { note.textContent = countText(textarea); });
  return el("div", {}, textarea, note);
}
function countText(ta) {
  return `${ta.value.length}/${DOT_INPUT_MAX}`;
}

/* Bottom sheet / modal. Returns a close() function. */
export function openSheet(content, { full = false } = {}) {
  const overlay = el("div", {
    class: "sheet-overlay",
    onclick: (e) => { if (e.target === overlay) close(); },
  }, el("div", { class: `sheet${full ? " sheet--full" : ""}` }, content));
  document.body.append(overlay);
  document.body.style.overflow = "hidden";
  function close() {
    overlay.remove();
    document.body.style.overflow = "";
  }
  return close;
}

/* Photo picker: opens camera/library, downsizes to a storable JPEG data URL. */
export function pickPhoto(cb) {
  const inp = el("input", { type: "file", accept: "image/*", style: "display:none" });
  inp.onchange = () => {
    const f = inp.files[0];
    if (!f) return;
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      const s = Math.min(1, 800 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      cb(c.toDataURL("image/jpeg", 0.72));
    };
    img.src = url;
  };
  document.body.append(inp);
  inp.click();
  setTimeout(() => inp.remove(), 120000);
}

/* Voice note → Dot transcribes & tidies into the textarea. Max 15s. */
const VOICE_MAX_S = 15;

export function voiceButton(textarea) {
  const btn = el("button", { class: "btn btn--ghost btn--small mic-btn", type: "button" }, "🎙 Say it instead");
  let rec = null, timer = null;

  btn.onclick = async () => {
    if (rec) { rec.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia) return toast("Voice notes need a secure (https) connection");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return toast("Microphone not available");
    }
    const chunks = [];
    rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => chunks.push(e.data);
    let remain = VOICE_MAX_S;
    btn.classList.add("recording");
    btn.textContent = `◼ Recording ${remain}s — tap to stop`;
    timer = setInterval(() => {
      remain--;
      btn.textContent = `◼ Recording ${remain}s — tap to stop`;
      if (remain <= 0) rec?.stop();
    }, 1000);

    rec.onstop = async () => {
      clearInterval(timer);
      btn.classList.remove("recording");
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      rec = null;
      busy(btn, true, "Dot is listening…");
      try {
        const b64 = await blobToBase64(blob);
        const text = await transcribeVoice(b64, (blob.type || "audio/webm").split(";")[0]);
        textarea.value = text.slice(0, DOT_INPUT_MAX);
        textarea.dispatchEvent(new Event("input"));
        toast("Dot wrote up your voice note ✓");
      } catch {
        toast("Dot couldn't hear that — try typing instead");
      }
      busy(btn, false);
      btn.textContent = "🎙 Say it instead";
    };
    rec.start();
  };
  return btn;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
