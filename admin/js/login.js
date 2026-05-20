import { signIn, redirectIfLoggedIn, DASHBOARD_PATH } from "./auth.js";

await redirectIfLoggedIn();

const form = document.getElementById("login-form");
const errorEl = document.getElementById("login-error");
const submitBtn = document.getElementById("login-submit");

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function hideError() {
  errorEl.hidden = true;
  errorEl.textContent = "";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const email = form.email.value.trim();
  const password = form.password.value;

  submitBtn.disabled = true;
  submitBtn.textContent = "Přihlašuji…";

  try {
    await signIn(email, password);
    window.location.replace(DASHBOARD_PATH);
  } catch (err) {
    const msg =
      err?.message === "Invalid login credentials"
        ? "Neplatný e-mail nebo heslo."
        : err?.message || "Přihlášení se nezdařilo.";
    showError(msg);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Přihlásit se";
  }
});
