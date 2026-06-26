import { apiFetch } from "./api.js";
import { uploadVideo } from "./storage.js";
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
const uploadForm = document.getElementById("video-upload-form");
const videoFileInput = document.getElementById("video-file");
const uploadSubmitBtn = document.getElementById("upload-submit");
const uploadHintEl = document.getElementById("upload-hint");
const formSuccessEl = document.getElementById("form-success");
const formErrorEl = document.getElementById("form-error");
const listErrorEl = document.getElementById("list-error");
const listLoadingEl = document.getElementById("list-loading");
const listEmptyEl = document.getElementById("list-empty");
const videoGridEl = document.getElementById("video-grid");
const refreshBtn = document.getElementById("refresh-btn");
const typeFilterBtns = [...document.querySelectorAll(".admin-filter [data-type]")];
const adminWrap = document.querySelector(".admin-wrap");

let currentType = "social";
let allVideos = [];

const TYPE_HINTS = {
  social: "Videa pro sekci „Aktuálně na sociálních sítích“ na úvodní stránce.",
  presentation: "Videa pro sekci „Profesionální prezentace, která prodává“ na úvodní stránce.",
};

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

function showFormMessage(el, message) {
  el.textContent = message;
  el.hidden = false;
  setTimeout(() => {
    el.hidden = true;
  }, 5000);
}

function setCurrentType(type) {
  currentType = type;
  typeFilterBtns.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.type === type);
  });
  uploadHintEl.textContent = TYPE_HINTS[type] ?? "";
  loadVideos();
}

typeFilterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.type) setCurrentType(btn.dataset.type);
  });
});

function createVideoCard(video) {
  const card = document.createElement("article");
  card.className = "admin-video-card";

  const filename = video.filename || video.url?.split("/").pop() || "";
  const title = video.name || filename;

  card.innerHTML = `
    <div class="admin-video-card__preview">
      <video controls playsinline preload="metadata" src="${escapeHtml(video.url)}" title="${escapeHtml(title)}"></video>
    </div>
    <div class="admin-video-card__body">
      <p class="admin-video-card__title">${escapeHtml(title)}</p>
      <p class="admin-video-card__meta">${escapeHtml(filename)}</p>
      <button type="button" class="admin-btn admin-btn--danger admin-btn--sm delete-btn">Smazat</button>
    </div>
  `;

  card.querySelector(".delete-btn").addEventListener("click", () => deleteVideo(video));
  return card;
}

function renderGrid() {
  videoGridEl.innerHTML = "";

  if (!allVideos.length) {
    listEmptyEl.hidden = false;
    videoGridEl.hidden = true;
    return;
  }

  listEmptyEl.hidden = true;
  videoGridEl.hidden = false;

  for (const video of allVideos) {
    videoGridEl.appendChild(createVideoCard(video));
  }
}

async function loadVideos() {
  const authSession = await ensureAuthenticated();
  if (!authSession) return;

  listErrorEl.hidden = true;
  listLoadingEl.hidden = false;
  listEmptyEl.hidden = true;
  videoGridEl.hidden = true;

  try {
    const data = await apiFetch(`videos?type=${encodeURIComponent(currentType)}`);
    listLoadingEl.hidden = true;
    allVideos = Array.isArray(data) ? data : [];
  } catch (error) {
    listLoadingEl.hidden = true;
    listErrorEl.textContent = "Nepodařilo se načíst videa: " + error.message;
    listErrorEl.hidden = false;
    return;
  }

  renderGrid();
}

async function deleteVideo(video) {
  const authSession = await ensureAuthenticated();
  if (!authSession) return;

  const filename = video.filename || decodeURIComponent((video.url || "").split("/").pop() || "");
  const label = video.name || filename;

  const confirmed = confirm(
    `Opravdu smazat video „${label}"?\n\nSoubor bude trvale odstraněn z webu.`
  );
  if (!confirmed) return;

  try {
    await apiFetch(
      `videos?type=${encodeURIComponent(currentType)}&filename=${encodeURIComponent(filename)}`,
      { method: "DELETE" }
    );
  } catch (error) {
    alert("Chyba při mazání: " + error.message);
    return;
  }

  allVideos = allVideos.filter((item) => item.filename !== filename && item.url !== video.url);
  renderGrid();
}

uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formSuccessEl.hidden = true;
  formErrorEl.hidden = true;

  const file = videoFileInput.files?.[0];
  if (!file) {
    formErrorEl.textContent = "Vyberte soubor videa.";
    formErrorEl.hidden = false;
    return;
  }

  const authSession = await ensureAuthenticated();
  if (!authSession) return;

  uploadSubmitBtn.disabled = true;
  uploadSubmitBtn.textContent = "Nahrávám…";

  try {
    await uploadVideo(file, currentType);
  } catch (error) {
    uploadSubmitBtn.disabled = false;
    uploadSubmitBtn.textContent = "Nahrát video";
    formErrorEl.textContent = "Nahrání se nezdařilo: " + error.message;
    formErrorEl.hidden = false;
    return;
  }

  uploadSubmitBtn.disabled = false;
  uploadSubmitBtn.textContent = "Nahrát video";
  uploadForm.reset();
  showFormMessage(formSuccessEl, "Video bylo nahráno.");
  await loadVideos();
});

refreshBtn.addEventListener("click", loadVideos);

setPageEnabled(true);
await loadVideos();
