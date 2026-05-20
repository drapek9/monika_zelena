import { supabase } from "./config.js";

export const PROPERTY_IMAGES_BUCKET = "property_images";

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

/**
 * Upload image to Supabase Storage bucket property_images.
 * Returns public URL for the properties.image column.
 */
export async function uploadPropertyImage(file) {
  if (!file) {
    throw new Error("Nebyl vybrán žádný soubor.");
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Povolené formáty: JPEG, PNG, WebP, GIF.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Soubor je příliš velký (max. 5 MB).");
  }

  const ext = extensionFromFile(file);
  const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const { data, error } = await supabase.storage
    .from(PROPERTY_IMAGES_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw error;
  }

  const { data: urlData } = supabase.storage
    .from(PROPERTY_IMAGES_BUCKET)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/** Cesta v bucketu z veřejné Supabase Storage URL (jinak null = externí / lokální URL). */
export function getPropertyImageStoragePath(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string") return null;

  try {
    const pathname = new URL(imageUrl).pathname;
    const marker = `/storage/v1/object/public/${PROPERTY_IMAGES_BUCKET}/`;
    const idx = pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

/** Smaže soubor z property_images, pokud image URL odkazuje na tento bucket. */
export async function deletePropertyImageFromStorage(imageUrl) {
  const path = getPropertyImageStoragePath(imageUrl);
  if (!path) {
    return { skipped: true, reason: "not_storage_url" };
  }

  const { data, error } = await supabase.storage
    .from(PROPERTY_IMAGES_BUCKET)
    .remove([path]);

  if (error) {
    throw error;
  }

  return { skipped: false, path, data };
}
