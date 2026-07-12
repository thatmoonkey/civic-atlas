import { el, toast, busy, dotSays } from "../ui.js";
import { mergeRemote } from "../store.js";
import { sendOtp, verifyOtp, fetchRemoteState } from "../supabase.js";

// Sign-in gate shown when an anonymous user opens Track or Report.
// Email → code from the email (must be entered within 90 seconds) → account.

const CODE_WINDOW_S = 90;

export function renderAuthGate(root, onSignedIn) {
  let email = "";
  const box = el("div", { class: "stack reveal", style: "margin-top:18px" });

  root.append(
    el("div", { class: "reveal" },
      el("p", { class: "eyebrow" }, "Free account"),
      el("h1", {}, "Save your tracking."),
    ),
    el("div", { class: "reveal", style: "margin-top:14px" },
      dotSays("Your plan is safe on this device — but tracking and reports need a free account, so your numbers are backed up and waiting wherever you sign in. Just your email, no password.", true)
    ),
    box
  );

  emailStage();

  /* stage 1 — email */
  function emailStage() {
    box.innerHTML = "";
    const emailIn = el("input", {
      type: "email", placeholder: "you@example.com", autocomplete: "email",
      value: email, inputmode: "email",
    });
    const sendBtn = el("button", {
      class: "btn btn--primary btn--block",
      onclick: async () => {
        email = emailIn.value.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast("That email doesn't look right");
        busy(sendBtn, true, "Sending code…");
        try {
          await sendOtp(email);
          toast("Code sent — check your inbox");
          codeStage();
        } catch (e) {
          busy(sendBtn, false);
          toast(/rate/i.test(e.message) ? "Too many tries — wait a minute, then resend" : "Couldn't send the code — try again");
        }
      },
    }, "Email me a sign-in code");
    box.append(
      el("label", { class: "field" }, el("span", {}, "Email address"), emailIn),
      sendBtn
    );
    emailIn.focus();
  }

  /* stage 2 — code + 90s countdown */
  function codeStage() {
    box.innerHTML = "";
    let remain = CODE_WINDOW_S;
    let expired = false;

    const codeIn = el("input", {
      type: "text", inputmode: "numeric", autocomplete: "one-time-code",
      placeholder: "Code from your email", maxlength: "10",
      style: "text-align:center;font-size:1.4rem;letter-spacing:0.35em;font-weight:700",
    });
    const clock = el("p", { class: "small", style: "text-align:center" });
    const verifyBtn = el("button", {
      class: "btn btn--primary btn--block",
      onclick: async () => {
        if (expired) return toast("That code has expired — send a new one");
        const token = codeIn.value.trim();
        if (token.length < 6) return toast("Enter the full code from your email");
        busy(verifyBtn, true, "Checking…");
        try {
          await verifyOtp(email, token);
          clearInterval(timer);
          toast("You're in 🎉");
          const remote = await fetchRemoteState();
          mergeRemote(remote);
          onSignedIn();
        } catch {
          busy(verifyBtn, false);
          toast("That code didn't match — check it and try again");
        }
      },
    }, "Create my free account");
    const resend = el("button", {
      class: "link-btn", style: "align-self:center",
      onclick: () => emailStage(),
    }, "Send a new code");

    const tick = () => {
      if (remain <= 0) {
        expired = true;
        clearInterval(timer);
        codeIn.disabled = true;
        verifyBtn.disabled = true;
        clock.textContent = "Code expired — send a new one below.";
        return;
      }
      clock.textContent = `Enter it within ${remain}s`;
      remain--;
    };
    const timer = setInterval(tick, 1000);
    tick();

    box.append(
      el("p", { class: "small", style: "text-align:center" }, `We emailed a code to ${email}`),
      codeIn,
      clock,
      verifyBtn,
      resend
    );
    codeIn.focus();
  }
}
