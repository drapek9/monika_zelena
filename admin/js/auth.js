import { supabase } from "./config.js";

export const LOGIN_PATH = "login.html";
export const DASHBOARD_PATH = "dashboard.html";

let authReady = false;
let authReadyPromise = null;

function logSession(label, session) {
  console.log(`[auth] ${label}`, session);
  console.log(`[auth] ${label} user id`, session?.user?.id ?? null);
}

/**
 * Wait until Supabase client has restored session from storage (INITIAL_SESSION).
 * Required before any RLS-protected request on page load.
 */
export function waitForAuthReady() {
  if (!authReadyPromise) {
    authReadyPromise = new Promise((resolve) => {
      let settled = false;

      function finish(event, session) {
        if (settled) return;
        settled = true;
        authReady = true;
        logSession(`auth ready (${event})`, session);
        resolve({ event, session });
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log("[auth] onAuthStateChange", event, session?.user?.id ?? null);
        logSession("current session (listener)", session);

        if (event === "INITIAL_SESSION") {
          subscription.unsubscribe();
          finish(event, session);
        }
      });
    });
  }
  return authReadyPromise;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("[auth] getSession error:", error);
    return null;
  }
  const session = data.session;
  logSession("getSession", session);
  return session;
}

/** Dashboard: wait for auth ready, redirect to login if no session. */
export async function requireAuth() {
  const { session } = await waitForAuthReady();
  logSession("requireAuth", session);

  if (!session?.user) {
    console.log("[auth] no session — redirect to login");
    window.location.replace(LOGIN_PATH);
    return null;
  }
  return session;
}

/** Login page: wait for auth ready, redirect to dashboard if already signed in. */
export async function redirectIfLoggedIn() {
  const { session } = await waitForAuthReady();
  if (session?.user) {
    console.log("[auth] already logged in — redirect to dashboard");
    window.location.replace(DASHBOARD_PATH);
  }
}

/**
 * Before INSERT / UPDATE / DELETE: confirm session is present.
 * Uses Supabase Auth context only (JWT attached automatically by client).
 */
export async function ensureAuthenticated() {
  const session = await getSession();
  if (!session?.user) {
    console.log("[auth] ensureAuthenticated failed — redirect to login");
    window.location.replace(LOGIN_PATH);
    return null;
  }
  return session;
}

export function onAuthStateChange(handler) {
  return supabase.auth.onAuthStateChange((event, session) => {
    console.log("[auth] onAuthStateChange", event, session?.user?.id ?? null);
    handler(event, session);
  });
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;

  logSession("signIn result", data.session);

  if (!data.session?.user) {
    throw new Error("Přihlášení proběhlo, ale session nebyla vytvořena.");
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
