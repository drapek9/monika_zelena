import { supabase } from "./config.js";

export const PROPERTY_IMAGES_BUCKET = "property_images";
export const PROJECT_IMAGES_BUCKET = "project_images";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

function extensionFromFile(file) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp", "gif"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[file.type] || "jpg";
}

function validateImageFile(file) {
  if (!file) {
    throw new Error("Nebyl vybrán žádný soubor.");
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Povolené formáty: JPEG, PNG, WebP, GIF.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Soubor je příliš velký (max. 5 MB).");
  }
}

export async function uploadImageToBucket(file, bucket) {
  validateImageFile(file);

  const ext = extensionFromFile(file);
  const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
}

export function getImageStoragePath(imageUrl, bucket) {
  if (!imageUrl || typeof imageUrl !== "string") return null;

  try {
    const pathname = new URL(imageUrl).pathname;
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

export async function deleteImageFromStorage(imageUrl, bucket) {
  const path = getImageStoragePath(imageUrl, bucket);
  if (!path) {
    return { skipped: true, reason: "not_storage_url" };
  }

  const { data, error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;

  return { skipped: false, path, data };
}

export async function uploadPropertyImage(file) {
  return uploadImageToBucket(file, PROPERTY_IMAGES_BUCKET);
}

export function getPropertyImageStoragePath(imageUrl) {
  return getImageStoragePath(imageUrl, PROPERTY_IMAGES_BUCKET);
}

export async function deletePropertyImageFromStorage(imageUrl) {
  return deleteImageFromStorage(imageUrl, PROPERTY_IMAGES_BUCKET);
}

export async function uploadProjectImage(file) {
  return uploadImageToBucket(file, PROJECT_IMAGES_BUCKET);
}

export async function deleteProjectImageFromStorage(imageUrl) {
  return deleteImageFromStorage(imageUrl, PROJECT_IMAGES_BUCKET);
}
