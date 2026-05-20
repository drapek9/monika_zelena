import { supabase } from "./config.js";
import {
  requireAuth,
  ensureAuthenticated,
  signOut,
  onAuthStateChange,
  LOGIN_PATH,
} from "./auth.js";
import {
  uploadPropertyImage,
  deletePropertyImageFromStorage,
} from "./storage.js";

const session = await requireAuth();
if (!session) {
  throw new Error("Unauthenticated");
}

const userEmailEl = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const propertyForm = document.getElementById("property-form");
const propertyFormSection = document.getElementById("property-form-section");
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
const tbodyEl = document.getElementById("properties-tbody");
const refreshBtn = document.getElementById("refresh-btn");
const filterButtons = document.querySelectorAll(".admin-filter button");
const dashboardMain = document.querySelector(".admin-wrap");
const imageModeButtons = document.querySelectorAll("[data-image-mode]");
const imagePanelUrl = document.getElementById("image-panel-url");
const imagePanelFile = document.getElementById("image-panel-file");
const imageUrlInput = document.getElementById("image-url");
const imageFileInput = document.getElementById("image-file");
const imagePreview = document.getElementById("image-preview");

let allProperties = [];
let currentFilter = "all";
let imageMode = "url";
let imagePreviewUrl = null;
let editingId = null;
let editingImageUrl = null;

function setDashboardEnabled(enabled) {
  if (!dashboardMain) return;
  dashboardMain.style.opacity = enabled ? "1" : "0.5";
  dashboardMain.style.pointerEvents = enabled ? "" : "none";
}

setDashboardEnabled(false);
userEmailEl.textContent = session.user.email ?? "";

onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") {
    window.location.replace(LOGIN_PATH);
  }
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
    if (editingImageUrl && imageMode === "file") {
      showImagePreviewSrc(editingImageUrl);
    } else {
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
    return uploadPropertyImage(file);
  }

  const url = imageUrlInput.value.trim();
  if (!url) {
    if (editingImageUrl) return editingImageUrl;
    throw new Error("Zadejte URL obrázku, nebo přepněte na nahrání souboru.");
  }
  return url;
}

function setEditMode(prop) {
  editingId = prop.id;
  editingImageUrl = prop.image ?? null;

  formHeading.textContent = "Upravit nemovitost";
  formEditingHint.textContent = `Upravujete: ${prop.name}`;
  formEditingHint.hidden = false;
  formSubmitBtn.textContent = "Uložit změny";
  formCancelBtn.hidden = false;
  propertyFormSection.classList.add("is-editing");
  imageHint.textContent =
    "Ponechte URL beze změny, nebo nahrajte nový soubor — jinak zůstane stávající obrázek.";

  propertyForm.name.value = prop.name ?? "";
  propertyForm.price.value = prop.price ?? "";
  propertyForm.location.value = prop.location ?? "";
  propertyForm.type.value = prop.type ?? "sale";
  propertyForm.sold.value = prop.sold ? "true" : "false";
  propertyForm.link.value = prop.link ?? "";

  setImageMode("url");
  imageUrlInput.value = prop.image ?? "";
  clearImagePreview();
  if (prop.image) {
    showImagePreviewSrc(prop.image);
  }

  propertyFormSection.scrollIntoView({ behavior: "smooth", block: "start" });
  renderTable();
}

function cancelEdit() {
  editingId = null;
  editingImageUrl = null;
  formHeading.textContent = "Přidat nemovitost";
  formEditingHint.hidden = true;
  formSubmitBtn.textContent = "Uložit nemovitost";
  formCancelBtn.hidden = true;
  propertyFormSection.classList.remove("is-editing");
  imageHint.textContent =
    "Vložte URL, nebo nahrajte soubor do úložiště Supabase (property_images).";
  propertyForm.reset();
  setImageMode("url");
  clearImagePreview();
  formSuccessEl.hidden = true;
  formErrorEl.hidden = true;
  renderTable();
}

formCancelBtn.addEventListener("click", cancelEdit);

function formatPrice(price) {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(price);
}

function typeLabel(type) {
  return type === "rent" ? "Pronájem" : "Prodej";
}

function showFormMessage(el, message) {
  el.textContent = message;
  el.hidden = false;
  setTimeout(() => {
    el.hidden = true;
  }, 4000);
}

function hideListUi() {
  listLoadingEl.hidden = true;
  listEmptyEl.hidden = true;
  tableWrapEl.hidden = true;
}

function showListError(message) {
  listErrorEl.textContent = message;
  listErrorEl.hidden = false;
  hideListUi();
}

function getFilteredProperties() {
  if (currentFilter === "active") {
    return allProperties.filter((p) => !p.sold);
  }
  if (currentFilter === "sold") {
    return allProperties.filter((p) => p.sold);
  }
  return allProperties;
}

function renderTable() {
  const items = getFilteredProperties();
  tbodyEl.innerHTML = "";

  if (items.length === 0) {
    listEmptyEl.hidden = false;
    tableWrapEl.hidden = true;
    return;
  }

  listEmptyEl.hidden = true;
  tableWrapEl.hidden = false;

  for (const prop of items) {
    const tr = document.createElement("tr");
    tr.dataset.id = prop.id;
    if (editingId === prop.id) {
      tr.classList.add("is-editing");
    }

    const typeClass = prop.type === "rent" ? "admin-badge--rent" : "admin-badge--sale";
    const statusClass = prop.sold ? "admin-badge--sold" : "admin-badge--active";
    const statusText = prop.sold ? "Prodáno" : "Aktivní";

    tr.innerHTML = `
      <td data-label="Název">${escapeHtml(prop.name)}</td>
      <td data-label="Cena">${formatPrice(prop.price)}</td>
      <td data-label="Lokalita">${escapeHtml(prop.location)}</td>
      <td data-label="Typ"><span class="admin-badge ${typeClass}">${typeLabel(prop.type)}</span></td>
      <td data-label="Stav"><span class="admin-badge ${statusClass}">${statusText}</span></td>
      <td class="admin-actions-cell" data-label="">
        <div class="admin-actions">
          <button type="button" class="admin-btn admin-btn--ghost admin-btn--sm edit-btn">Upravit</button>
          <label class="admin-toggle">
            <input type="checkbox" class="sold-toggle" ${prop.sold ? "checked" : ""} aria-label="Označit jako prodané" />
            Prodáno
          </label>
          <button type="button" class="admin-btn admin-btn--danger admin-btn--sm delete-btn">Smazat</button>
        </div>
      </td>
    `;

    tr.querySelector(".edit-btn").addEventListener("click", () => setEditMode(prop));

    const soldToggle = tr.querySelector(".sold-toggle");
    soldToggle.addEventListener("change", () =>
      toggleSold(prop.id, soldToggle.checked, soldToggle)
    );

    const deleteBtn = tr.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", () => deleteProperty(prop));

    tbodyEl.appendChild(tr);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

async function loadProperties() {
  const authSession = await ensureAuthenticated();
  if (!authSession) return;

  listErrorEl.hidden = true;
  listLoadingEl.hidden = false;
  listEmptyEl.hidden = true;
  tableWrapEl.hidden = true;

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .order("name", { ascending: true });

  listLoadingEl.hidden = true;

  if (error) {
    showListError("Nepodařilo se načíst nemovitosti: " + error.message);
    return;
  }

  allProperties = data ?? [];

  if (editingId && !allProperties.some((p) => p.id === editingId)) {
    cancelEdit();
  }

  renderTable();
}

async function toggleSold(id, sold, checkboxEl) {
  const authSession = await ensureAuthenticated();
  if (!authSession) return;

  checkboxEl.disabled = true;

  const { error } = await supabase.from("properties").update({ sold }).eq("id", id);

  checkboxEl.disabled = false;

  if (error) {
    checkboxEl.checked = !sold;
    alert("Chyba při změně stavu: " + error.message);
    return;
  }

  const item = allProperties.find((p) => p.id === id);
  if (item) item.sold = sold;
  if (editingId === id) {
    propertyForm.sold.value = sold ? "true" : "false";
  }
  renderTable();
}

async function deleteProperty(prop) {
  const authSession = await ensureAuthenticated();
  if (!authSession) return;

  const confirmed = confirm(
    `Opravdu smazat nemovitost „${prop.name}"?\n\nTuto akci nelze vrátit.`
  );
  if (!confirmed) return;

  const { error } = await supabase.from("properties").delete().eq("id", prop.id);

  if (error) {
    alert("Chyba při mazání: " + error.message);
    return;
  }

  if (prop.image) {
    try {
      const result = await deletePropertyImageFromStorage(prop.image);
      if (!result.skipped) {
        console.log("[storage] Smazán obrázek:", result.path);
      }
    } catch (storageErr) {
      console.warn("[storage] Obrázek se nepodařilo smazat:", storageErr);
    }
  }

  if (editingId === prop.id) {
    cancelEdit();
  }

  allProperties = allProperties.filter((p) => p.id !== prop.id);
  renderTable();
}

propertyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formSuccessEl.hidden = true;
  formErrorEl.hidden = true;

  if (!propertyForm.checkValidity()) {
    propertyForm.reportValidity();
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
    formSubmitBtn.textContent = isEdit ? "Uložit změny" : "Uložit nemovitost";
    formErrorEl.textContent = err?.message || "Obrázek se nepodařilo zpracovat.";
    formErrorEl.hidden = false;
    return;
  }

  const payload = {
    name: propertyForm.name.value.trim(),
    price: Number(propertyForm.price.value),
    location: propertyForm.location.value.trim(),
    type: propertyForm.type.value,
    link: propertyForm.link.value.trim(),
    image: imageValue,
    sold: propertyForm.sold.value === "true",
  };

  formSubmitBtn.textContent = isEdit ? "Ukládám změny…" : "Ukládám…";

  const { error } = isEdit
    ? await supabase.from("properties").update(payload).eq("id", editingId)
    : await supabase.from("properties").insert(payload);

  formSubmitBtn.disabled = false;
  formSubmitBtn.textContent = isEdit ? "Uložit změny" : "Uložit nemovitost";

  if (error) {
    formErrorEl.textContent =
      (isEdit ? "Úprava se nezdařila: " : "Uložení se nezdařilo: ") + error.message;
    formErrorEl.hidden = false;
    return;
  }

  if (isEdit && editingImageUrl && imageValue !== editingImageUrl) {
    try {
      await deletePropertyImageFromStorage(editingImageUrl);
    } catch (storageErr) {
      console.warn("[storage] Starý obrázek se nepodařilo smazat:", storageErr);
    }
  }

  if (isEdit) {
    cancelEdit();
    showFormMessage(formSuccessEl, "Nemovitost byla upravena.");
  } else {
    propertyForm.reset();
    setImageMode("url");
    clearImagePreview();
    showFormMessage(formSuccessEl, "Nemovitost byla uložena.");
  }

  await loadProperties();
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    currentFilter = btn.dataset.filter;
    renderTable();
  });
});

refreshBtn.addEventListener("click", loadProperties);

setDashboardEnabled(true);
await loadProperties();
