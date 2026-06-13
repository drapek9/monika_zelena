import { supabase } from "./config.js";
import {
  requireAuth,
  ensureAuthenticated,
  signOut,
  onAuthStateChange,
  LOGIN_PATH,
} from "./auth.js";

const session = await requireAuth();
if (!session) throw new Error("Unauthenticated");

const userEmailEl = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const reviewForm = document.getElementById("review-form");
const reviewFormSection = document.getElementById("review-form-section");
const formHeading = document.getElementById("form-heading");
const formEditingHint = document.getElementById("form-editing-hint");
const formSubmitBtn = document.getElementById("form-submit");
const formCancelBtn = document.getElementById("form-cancel");
const formSuccessEl = document.getElementById("form-success");
const formErrorEl = document.getElementById("form-error");
const listErrorEl = document.getElementById("list-error");
const listLoadingEl = document.getElementById("list-loading");
const listEmptyEl = document.getElementById("list-empty");
const tableWrapEl = document.getElementById("table-wrap");
const tbodyEl = document.getElementById("reviews-tbody");
const refreshBtn = document.getElementById("refresh-btn");
const adminWrap = document.querySelector(".admin-wrap");

let allReviews = [];
let editingId = null;

function setPageEnabled(enabled) {
  if (!adminWrap) return;
  adminWrap.style.opacity = enabled ? "1" : "0.5";
  adminWrap.style.pointerEvents = enabled ? "" : "none";
}

setPageEnabled(false);
userEmailEl.textContent = session.user.email ?? "";

onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") window.location.replace(LOGIN_PATH);
});

logoutBtn.addEventListener("click", async () => {
  await signOut();
  window.location.replace(LOGIN_PATH);
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function truncateText(str, max = 80) {
  const text = String(str ?? "");
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function showFormMessage(el, message) {
  el.textContent = message;
  el.hidden = false;
  setTimeout(() => {
    el.hidden = true;
  }, 4000);
}

function setEditMode(review) {
  editingId = review.id;

  formHeading.textContent = "Upravit recenzi";
  formEditingHint.textContent = `Upravujete recenzi od: ${review.author}`;
  formEditingHint.hidden = false;
  formSubmitBtn.textContent = "Uložit změny";
  formCancelBtn.hidden = false;
  reviewFormSection.classList.add("is-editing");

  reviewForm.text.value = review.text ?? "";
  reviewForm.author.value = review.author ?? "";

  reviewFormSection.scrollIntoView({ behavior: "smooth", block: "start" });
  renderTable();
}

function cancelEdit() {
  editingId = null;
  formHeading.textContent = "Přidat recenzi";
  formEditingHint.hidden = true;
  formSubmitBtn.textContent = "Uložit recenzi";
  formCancelBtn.hidden = true;
  reviewFormSection.classList.remove("is-editing");
  reviewForm.reset();
  formSuccessEl.hidden = true;
  formErrorEl.hidden = true;
  renderTable();
}

formCancelBtn.addEventListener("click", cancelEdit);

function renderTable() {
  tbodyEl.innerHTML = "";

  if (!allReviews.length) {
    listEmptyEl.hidden = false;
    tableWrapEl.hidden = true;
    return;
  }

  listEmptyEl.hidden = true;
  tableWrapEl.hidden = false;

  for (const review of allReviews) {
    const tr = document.createElement("tr");
    if (editingId === review.id) tr.classList.add("is-editing");

    tr.innerHTML = `
      <td data-label="Text">${escapeHtml(truncateText(review.text))}</td>
      <td data-label="Kdo napsal">${escapeHtml(review.author)}</td>
      <td class="admin-actions-cell" data-label="">
        <div class="admin-actions">
          <button type="button" class="admin-btn admin-btn--ghost admin-btn--sm edit-btn">Upravit</button>
          <button type="button" class="admin-btn admin-btn--danger admin-btn--sm delete-btn">Smazat</button>
        </div>
      </td>
    `;

    tr.querySelector(".edit-btn").addEventListener("click", () => setEditMode(review));
    tr.querySelector(".delete-btn").addEventListener("click", () => deleteReview(review));

    tbodyEl.appendChild(tr);
  }
}

async function loadReviews() {
  const authSession = await ensureAuthenticated();
  if (!authSession) return;

  listErrorEl.hidden = true;
  listLoadingEl.hidden = false;
  listEmptyEl.hidden = true;
  tableWrapEl.hidden = true;

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false });

  listLoadingEl.hidden = true;

  if (error) {
    listErrorEl.textContent = "Nepodařilo se načíst recenze: " + error.message;
    listErrorEl.hidden = false;
    return;
  }

  allReviews = data ?? [];

  if (editingId && !allReviews.some((r) => r.id === editingId)) {
    cancelEdit();
  }

  renderTable();
}

async function deleteReview(review) {
  const authSession = await ensureAuthenticated();
  if (!authSession) return;

  const confirmed = confirm(
    `Opravdu smazat recenzi od „${review.author}"?\n\nTuto akci nelze vrátit.`
  );
  if (!confirmed) return;

  const { error } = await supabase.from("reviews").delete().eq("id", review.id);

  if (error) {
    alert("Chyba při mazání: " + error.message);
    return;
  }

  if (editingId === review.id) cancelEdit();

  allReviews = allReviews.filter((r) => r.id !== review.id);
  renderTable();
}

reviewForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formSuccessEl.hidden = true;
  formErrorEl.hidden = true;

  if (!reviewForm.checkValidity()) {
    reviewForm.reportValidity();
    return;
  }

  const authSession = await ensureAuthenticated();
  if (!authSession) return;

  const isEdit = Boolean(editingId);

  formSubmitBtn.disabled = true;
  formSubmitBtn.textContent = isEdit ? "Ukládám změny…" : "Ukládám…";

  const payload = {
    text: reviewForm.text.value.trim(),
    author: reviewForm.author.value.trim(),
  };

  const { error } = isEdit
    ? await supabase.from("reviews").update(payload).eq("id", editingId)
    : await supabase.from("reviews").insert(payload);

  formSubmitBtn.disabled = false;
  formSubmitBtn.textContent = isEdit ? "Uložit změny" : "Uložit recenzi";

  if (error) {
    formErrorEl.textContent =
      (isEdit ? "Úprava se nezdařila: " : "Uložení se nezdařilo: ") + error.message;
    formErrorEl.hidden = false;
    return;
  }

  if (isEdit) {
    cancelEdit();
    showFormMessage(formSuccessEl, "Recenze byla upravena.");
  } else {
    reviewForm.reset();
    showFormMessage(formSuccessEl, "Recenze byla uložena.");
  }

  await loadReviews();
});

refreshBtn.addEventListener("click", loadReviews);

setPageEnabled(true);
await loadReviews();
