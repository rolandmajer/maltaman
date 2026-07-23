// Private file storage for uploaded photos. Files live outside `public/` and are only
// served through the authenticated `/api/photos/[id]/file` route handler.

import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

const STORAGE_DIR = path.resolve(process.cwd(), process.env.STORAGE_DIR ?? "./storage");
const PHOTOS_DIR = path.join(STORAGE_DIR, "photos");
const THUMBS_DIR = path.join(PHOTOS_DIR, "thumbnails");

export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB raw upload cap before optimization

async function ensureDirs() {
  await mkdir(PHOTOS_DIR, { recursive: true });
  await mkdir(THUMBS_DIR, { recursive: true });
}

/**
 * Optimizes and stores an uploaded photo. Re-encodes to JPEG, capped at 2000px on the long edge,
 * to keep photos usable in the PDF while bounding storage/offline-queue size.
 */
export async function savePhotoFile(bytes: Buffer): Promise<{ storageKey: string; thumbnailKey: string }> {
  await ensureDirs();
  const id = randomUUID();
  const storageKey = `${id}.jpg`;
  const thumbnailKey = `${id}.thumb.jpg`;

  const optimized = await sharp(bytes)
    .rotate() // apply EXIF orientation
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();

  const thumbnail = await sharp(bytes)
    .rotate()
    .resize({ width: 400, height: 400, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();

  await writeFile(path.join(PHOTOS_DIR, storageKey), optimized);
  await writeFile(path.join(THUMBS_DIR, thumbnailKey), thumbnail);

  return { storageKey, thumbnailKey };
}

export async function readPhotoFile(storageKey: string, thumbnail = false): Promise<Buffer> {
  const dir = thumbnail ? THUMBS_DIR : PHOTOS_DIR;
  return readFile(path.join(dir, storageKey));
}

export async function deletePhotoFile(storageKey: string, thumbnailKey: string | null) {
  await Promise.all([
    unlink(path.join(PHOTOS_DIR, storageKey)).catch(() => undefined),
    thumbnailKey ? unlink(path.join(THUMBS_DIR, thumbnailKey)).catch(() => undefined) : Promise.resolve(),
  ]);
}
