import { supabase } from "./config.js";
import {
  requireAuth,
  ensureAuthenticated,
  signOut,
  onAuthStateChange,
  LOGIN_PATH,
} from "./auth.js";
import {
  uploadProjectImage,
  deleteProjectImageFromStorage,
} from "./storage.js";

const session = await requireAuth();
if (!session) throw new Error("Unauthenticated");

const userEmailEl = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const projectForm = document.getElementById("project-form");
const projectFormSection = document.getElementById("project-form-section");
const formHeading = document.getElementById("form-heading");
const formEditingHint = document.getElementById("form-editing-hint");
const imageHint = document.getElementById("image-hint");
const formSubmitBtn = document.getElementById("form-submit");
const formCancelBtn = document.getElementById("form-cancel");
const formSuccessEl = document.getElementById("form-success");
const formErrorEl = document.getElementById("form-error");
const listErrorEl = document.getElementById("list-error");
const listLoadingEl = document.getElementById("list-loading");
const listEmptyEl = document.getElementById("list-empty");
const tableWrapEl = document.getElementById("table-wrap");
const tbodyEl = document.getElementById("projects-tbody");
const refreshBtn = document.getElementById("refresh-btn");
const adminWrap = document.querySelector(".admin-wrap");
const imageModeButtons = document.querySelectorAll("[data-image-mode]");
const imagePanelUrl = document.getElementById("image-panel-url");
const imagePanelFile = document.getElementById("image-panel-file");
const imageUrlInput = document.getElementById("image-url");
const imageFileInput = document.getElementById("image-file");
const imagePreview = document.getElementById("image-preview");

let allProjects = [];
let imageMode = "url";
let imagePreviewUrl = null;
let editingId = null;
let editingImageUrl = null;

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

function setImageMode(mode) {
  imageMode = mode;
  imageModeButtons.forEach((btn) => {
    const active = btn.dataset.imageMode === mode;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  imagePanelUrl.hidden = mode !== "url";
  imagePanelFile.hidden = mode !== "file";
}

imageModeButtons.forEach((btn) => {
  btn.addEventListener("click", () => setImageMode(btn.dataset.imageMode));
});

function clearImagePreview() {
  if (imagePreviewUrl) {
    URL.revokeObjectURL(imagePreviewUrl);
    imagePreviewUrl = null;
  }
  imageFileInput.value = "";
  imagePreview.hidden = true;
  imagePreview.removeAttribute("src");
}

function showImagePreviewSrc(src) {
  clearImagePreview();
  if (!src) return;
  imagePreview.src = src;
  imagePreview.hidden = false;
}

imageFileInput.addEventListener("change", () => {
  if (imagePreviewUrl) {
    URL.revokeObjectURL(imagePreviewUrl);
    imagePreviewUrl = null;
  }
  const file = imageFileInput.files?.[0];
  if (!file) {
    if (editingImageUrl && imageMode === "file") showImagePreviewSrc(editingImageUrl);
    else {
      imagePreview.hidden = true;
      imagePreview.removeAttribute("src");
    }
    return;
  }
  imagePreviewUrl = URL.createObjectURL(file);
  imagePreview.src = imagePreviewUrl;
  imagePreview.hidden = false;
});

async function resolveImageUrl() {
  if (imageMode === "file") {
    const file = imageFileInput.files?.[0];
    if (!file) {
      if (editingImageUrl) return editingImageUrl;
      throw new Error("Vyberte obrázek ze souboru, nebo přepněte na URL.");
    }
    return uploadProjectImage(file);
  }
  const url = imageUrlInput.value.trim();
  if (!url) {
    if (editingImageUrl) return editingImageUrl;
    throw new Error("Zadejte URL obrázku, nebo přepněte na nahrání souboru.");
  }
  return url;
}

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
  }, 4000);
}

function setEditMode(project) {
  editingId = project.id;
  editingImageUrl = project.image ?? null;

  formHeading.textContent = "Upravit projekt";
  formEditingHint.textContent = `Upravujete: ${project.name}`;
  formEditingHint.hidden = false;
  formSubmitBtn.textContent = "Uložit změny";
  formCancelBtn.hidden = false;
  projectFormSection.classList.add("is-editing");
  imageHint.textContent =
    "Ponechte URL beze změny, nebo nahrajte nový soubor — jinak zůstane stávající obrázek.";

  projectForm.name.value = project.name ?? "";
  projectForm.location.value = project.location ?? "";
  projectForm.description.value = project.description ?? "";
  projectForm.link.value = project.link ?? "";

  setImageMode("url");
  imageUrlInput.value = project.image ?? "";
  clearImagePreview();
  if (project.image) showImagePreviewSrc(project.image);

  projectFormSection.scrollIntoView({ behavior: "smooth", block: "start" });
  renderTable();
}

function cancelEdit() {
  editingId = null;
  editingImageUrl = null;
  formHeading.textContent = "Přidat projekt";
  formEditingHint.hidden = true;
  formSubmitBtn.textContent = "Uložit projekt";
  formCancelBtn.hidden = true;
  projectFormSection.classList.remove("is-editing");
  imageHint.textContent =
    "Vložte URL, nebo nahrajte soubor do úložiště Supabase (project_images).";
  projectForm.reset();
  setImageMode("url");
  clearImagePreview();
  formSuccessEl.hidden = true;
  formErrorEl.hidden = true;
  renderTable();
}

formCancelBtn.addEventListener("click", cancelEdit);

function renderTable() {
  tbodyEl.innerHTML = "";

  if (!allProjects.length) {
    listEmptyEl.hidden = false;
    tableWrapEl.hidden = true;
    return;
  }

  listEmptyEl.hidden = true;
  tableWrapEl.hidden = false;

  for (const project of allProjects) {
    const tr = document.createElement("tr");
    if (editingId === project.id) tr.classList.add("is-editing");

    const linkShort =
      project.link.length > 40 ? `${project.link.slice(0, 40)}…` : project.link;

    tr.innerHTML = `
      <td data-label="Název">${escapeHtml(project.name)}</td>
      <td data-label="Lokalita">${escapeHtml(project.location)}</td>
      <td data-label="Odkaz"><a href="${escapeHtml(project.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(linkShort)}</a></td>
      <td class="admin-actions-cell" data-label="">
        <div class="admin-actions">
          <button type="button" class="admin-btn admin-btn--ghost admin-btn--sm edit-btn">Upravit</button>
          <button type="button" class="admin-btn admin-btn--danger admin-btn--sm delete-btn">Smazat</button>
        </div>
      </td>
    `;

    tr.querySelector(".edit-btn").addEventListener("click", () => setEditMode(project));
    tr.querySelector(".delete-btn").addEventListener("click", () => deleteProject(project));

    tbodyEl.appendChild(tr);
  }
}

async function loadProjects() {
  const authSession = await ensureAuthenticated();
  if (!authSession) return;

  listErrorEl.hidden = true;
  listLoadingEl.hidden = false;
  listEmptyEl.hidden = true;
  tableWrapEl.hidden = true;

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  listLoadingEl.hidden = true;

  if (error) {
    listErrorEl.textContent = "Nepodařilo se načíst projekty: " + error.message;
    listErrorEl.hidden = false;
    return;
  }

  allProjects = data ?? [];

  if (editingId && !allProjects.some((p) => p.id === editingId)) {
    cancelEdit();
  }

  renderTable();
}

async function deleteProject(project) {
  const authSession = await ensureAuthenticated();
  if (!authSession) return;

  const confirmed = confirm(
    `Opravdu smazat projekt „${project.name}"?\n\nTuto akci nelze vrátit.`
  );
  if (!confirmed) return;

  const { error } = await supabase.from("projects").delete().eq("id", project.id);

  if (error) {
    alert("Chyba při mazání: " + error.message);
    return;
  }

  if (project.image) {
    try {
      await deleteProjectImageFromStorage(project.image);
    } catch (storageErr) {
      console.warn("[storage] Obrázek projektu se nepodařilo smazat:", storageErr);
    }
  }

  if (editingId === project.id) cancelEdit();

  allProjects = allProjects.filter((p) => p.id !== project.id);
  renderTable();
}

projectForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formSuccessEl.hidden = true;
  formErrorEl.hidden = true;

  if (!projectForm.checkValidity()) {
    projectForm.reportValidity();
    return;
  }

  const authSession = await ensureAuthenticated();
  if (!authSession) return;

  const isEdit = Boolean(editingId);

  formSubmitBtn.disabled = true;
  formSubmitBtn.textContent = isEdit ? "Ukládám změny…" : "Ukládám…";

  let imageValue;
  try {
    if (imageMode === "file" && imageFileInput.files?.[0]) {
      formSubmitBtn.textContent = "Nahrávám obrázek…";
    }
    imageValue = await resolveImageUrl();
  } catch (err) {
    formSubmitBtn.disabled = false;
    formSubmitBtn.textContent = isEdit ? "Uložit změny" : "Uložit projekt";
    formErrorEl.textContent = err?.message || "Obrázek se nepodařilo zpracovat.";
    formErrorEl.hidden = false;
    return;
  }

  const payload = {
    name: projectForm.name.value.trim(),
    location: projectForm.location.value.trim(),
    description: projectForm.description.value.trim(),
    link: projectForm.link.value.trim(),
    image: imageValue,
  };

  formSubmitBtn.textContent = isEdit ? "Ukládám změny…" : "Ukládám…";

  const { error } = isEdit
    ? await supabase.from("projects").update(payload).eq("id", editingId)
    : await supabase.from("projects").insert(payload);

  formSubmitBtn.disabled = false;
  formSubmitBtn.textContent = isEdit ? "Uložit změny" : "Uložit projekt";

  if (error) {
    formErrorEl.textContent =
      (isEdit ? "Úprava se nezdařila: " : "Uložení se nezdařilo: ") + error.message;
    formErrorEl.hidden = false;
    return;
  }

  if (isEdit && editingImageUrl && imageValue !== editingImageUrl) {
    try {
      await deleteProjectImageFromStorage(editingImageUrl);
    } catch (storageErr) {
      console.warn("[storage] Starý obrázek projektu se nepodařilo smazat:", storageErr);
    }
  }

  if (isEdit) {
    cancelEdit();
    showFormMessage(formSuccessEl, "Projekt byl upraven.");
  } else {
    projectForm.reset();
    setImageMode("url");
    clearImagePreview();
    showFormMessage(formSuccessEl, "Projekt byl uložen.");
  }

  await loadProjects();
});

refreshBtn.addEventListener("click", loadProjects);

setPageEnabled(true);
await loadProjects();
