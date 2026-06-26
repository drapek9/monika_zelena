import { apiFetch, getToken, setToken } from "./api.js";

export const LOGIN_PATH = "login.html";
export const DASHBOARD_PATH = "dashboard.html";

let authReady = false;
let authReadyPromise = null;
let currentUser = null;

export function waitForAuthReady() {
  if (!authReadyPromise) {
    authReadyPromise = (async () => {
      const token = getToken();
      if (!token) {
        authReady = true;
        currentUser = null;
        return { event: "INITIAL_SESSION", user: null };
      }

      try {
        const data = await apiFetch("auth/session");
        currentUser = data.user;
        authReady = true;
        return { event: "INITIAL_SESSION", user: currentUser };
      } catch {
        setToken(null);
        currentUser = null;
        authReady = true;
        return { event: "INITIAL_SESSION", user: null };
      }
    })();
  }
  return authReadyPromise;
}

export async function requireAuth() {
  const { user } = await waitForAuthReady();
  if (!user) {
    window.location.replace(LOGIN_PATH);
    return null;
  }
  return { user };
}

export async function redirectIfLoggedIn() {
  const { user } = await waitForAuthReady();
  if (user) {
    window.location.replace(DASHBOARD_PATH);
  }
}

export async function ensureAuthenticated() {
  const token = getToken();
  if (!token || !currentUser) {
    window.location.replace(LOGIN_PATH);
    return null;
  }
  return { user: currentUser };
}

const listeners = new Set();

export function onAuthStateChange(handler) {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

function emitAuthEvent(event) {
  listeners.forEach((handler) => handler(event, currentUser));
}

export async function signIn(email, password) {
  const data = await apiFetch("auth/login", {
    method: "POST",
    body: { email, password },
  });

  setToken(data.token);
  currentUser = data.user;
  emitAuthEvent("SIGNED_IN");
  return data;
}

export async function signOut() {
  try {
    await apiFetch("auth/logout", { method: "POST", body: {} });
  } catch {
    // ignore
  }
  setToken(null);
  currentUser = null;
  emitAuthEvent("SIGNED_OUT");
}
