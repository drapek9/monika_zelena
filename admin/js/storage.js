import { apiFetch } from "./api.js";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const VIDEO_TYPES = ["social", "presentation_portrait", "presentation_landscape"];

function validateImageFile(file) {
  if (!file) throw new Error("Nebyl vybrán žádný soubor.");
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Povolené formáty: JPEG, PNG, WebP, GIF.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Soubor je příliš velký (max. 5 MB).");
  }
}

function validateVideoFile(file) {
  if (!file) throw new Error("Nebyl vybrán žádný soubor.");
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    throw new Error("Povolené formáty: MP4, WebM, MOV, M4V.");
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error("Video je příliš velké (max. 100 MB).");
  }
}

async function uploadImage(file, bucket) {
  validateImageFile(file);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", bucket);
  const data = await apiFetch("upload", { method: "POST", body: formData });
  const url = typeof data?.url === "string" ? data.url.trim() : "";
  if (!url) {
    throw new Error("Server nevrátil URL nahraného souboru.");
  }
  return url;
}

async function uploadMedia(file, bucket) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", bucket);
  return apiFetch("upload", { method: "POST", body: formData });
}

export async function uploadPropertyImage(file) {
  return uploadImage(file, "properties");
}

export async function uploadProjectImage(file) {
  return uploadImage(file, "projects");
}

export async function uploadVideo(file, type) {
  if (!VIDEO_TYPES.includes(type)) {
    throw new Error("Neplatný typ videa.");
  }
  validateVideoFile(file);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", type);
  const data = await apiFetch("upload", { method: "POST", body: formData });
  const url = typeof data?.url === "string" ? data.url.trim() : "";
  if (!url) {
    throw new Error("Server nevrátil URL nahraného videa.");
  }
  return data;
}

export async function deletePropertyImageFromStorage() {
  return { skipped: true, reason: "server_managed" };
}

export async function deleteProjectImageFromStorage() {
  return { skipped: true, reason: "server_managed" };
}
