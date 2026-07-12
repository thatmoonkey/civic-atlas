// Supabase integration: email-OTP auth + cloud copy of the user's state.
// The app keeps working from localStorage; when signed in, every save is
// mirrored to the `mne_state` table (one jsonb row per user, RLS-guarded).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let session = null;

/* Resolve the current session once at boot, then follow auth changes. */
export async function initAuth(onChange) {
  const { data } = await supabase.auth.getSession();
  session = data.session;
  supabase.auth.onAuthStateChange((_event, s) => {
    const was = !!session;
    session = s;
    if (was !== !!s) onChange?.();
  });
  return session;
}

export function currentUser() {
  return session?.user || null;
}

export function isSignedIn() {
  return !!session;
}

/* --- email OTP ------------------------------------------------------ */

export async function sendOtp(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyOtp(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) throw error;
  session = data.session;
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
  session = null;
}

/* --- cloud state ---------------------------------------------------- */

export async function fetchRemoteState() {
  if (!session) return null;
  const { data, error } = await supabase
    .from("mne_state")
    .select("data")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (error) {
    console.warn("Supabase fetch failed", error.message);
    return null;
  }
  return data?.data || null;
}

let pushTimer = null;

/* Debounced mirror of the whole state blob; quiet no-op when signed out. */
export function pushRemoteState(state) {
  if (!session) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    const { error } = await supabase.from("mne_state").upsert({
      user_id: session.user.id,
      data: state,
      updated_at: new Date().toISOString(),
    });
    if (error) console.warn("Supabase push failed", error.message);
  }, 1500);
}
