// Private file storage for uploaded photos and the company logo. Files are never public —
// they are only served through authenticated route handlers (e.g. `/api/photos/[id]/file`).
//
// Two interchangeable backends implement the same put/get/delete contract:
//   • Tigris (S3-compatible object storage) — used in production on Fly.io. Selected
//     automatically when the bucket + credentials are present in the environment (Fly's
//     Tigris extension injects them as secrets: BUCKET_NAME, AWS_ACCESS_KEY_ID,
//     AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3, AWS_REGION).
//   • Local filesystem — used for development and tests, so no cloud credentials are needed.
//
// Object keys are self-describing (`<uuid>.jpg` for full images, `<uuid>.thumb.jpg` for
// thumbnails), so a single flat namespace is enough and the two keys never collide.

import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { AwsClient } from "aws4fetch";

export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB raw upload cap before optimization

const CONTENT_TYPE = "image/jpeg"; // every stored object is re-encoded to JPEG below

// ---------------------------------------------------------------------------
// Backend contract
// ---------------------------------------------------------------------------

interface StorageBackend {
  put(key: string, body: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Tigris / S3-compatible backend (aws4fetch signs each request with SigV4)
// ---------------------------------------------------------------------------

function createTigrisBackend(): StorageBackend {
  const endpoint = (process.env.AWS_ENDPOINT_URL_S3 ?? "https://fly.storage.tigris.dev").replace(/\/$/, "");
  const bucket = process.env.BUCKET_NAME!;
  const client = new AwsClient({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    region: process.env.AWS_REGION || "auto",
    service: "s3",
  });

  // Path-style URL. Keys are UUID-based (no characters needing escaping), so they are safe
  // to interpolate directly into the path Tigris signs and serves.
  const url = (key: string) => `${endpoint}/${bucket}/${key}`;

  return {
    async put(key, body) {
      const res = await client.fetch(url(key), {
        method: "PUT",
        body: new Uint8Array(body),
        // aws4fetch signs the request via `new Request(url, { duplex: "half", ... })`, which on
        // Node's undici suppresses automatic Content-Length computation for buffer bodies and
        // falls back to chunked transfer — Tigris's S3-compatible endpoint rejects that with
        // "411 MissingContentLength". Set it explicitly; it's excluded from SigV4 signing
        // (UNSIGNABLE_HEADERS) so this doesn't affect the signature.
        headers: { "Content-Type": CONTENT_TYPE, "Content-Length": String(body.byteLength) },
      });
      if (!res.ok) {
        throw new Error(`Tigris PUT ${key} failed: ${res.status} ${await res.text().catch(() => "")}`.trim());
      }
    },
    async get(key) {
      const res = await client.fetch(url(key), { method: "GET" });
      if (!res.ok) {
        throw new Error(`Tigris GET ${key} failed: ${res.status}`);
      }
      return Buffer.from(await res.arrayBuffer());
    },
    async delete(key) {
      const res = await client.fetch(url(key), { method: "DELETE" });
      // S3 delete is idempotent (204 on success, 404 if already gone) — both are fine.
      if (!res.ok && res.status !== 404) {
        throw new Error(`Tigris DELETE ${key} failed: ${res.status}`);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Local filesystem backend (development / tests)
// ---------------------------------------------------------------------------

function createLocalBackend(): StorageBackend {
  const dir = path.join(path.resolve(process.cwd(), process.env.STORAGE_DIR ?? "./storage"), "photos");
  const fileFor = (key: string) => path.join(dir, key);

  return {
    async put(key, body) {
      await mkdir(dir, { recursive: true });
      await writeFile(fileFor(key), body);
    },
    async get(key) {
      return readFile(fileFor(key));
    },
    async delete(key) {
      await unlink(fileFor(key)).catch(() => undefined);
    },
  };
}

// ---------------------------------------------------------------------------
// Backend selection — Tigris when configured, otherwise local filesystem.
// ---------------------------------------------------------------------------

const useTigris = Boolean(
  process.env.BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY,
);

const backend: StorageBackend = useTigris ? createTigrisBackend() : createLocalBackend();

// ---------------------------------------------------------------------------
// Public API (unchanged signatures — callers are backend-agnostic)
// ---------------------------------------------------------------------------

/**
 * Optimizes and stores an uploaded image. Re-encodes to JPEG, capped at 2000px on the long
 * edge, to keep photos usable in the PDF while bounding storage/offline-queue size. A 400px
 * thumbnail is stored alongside it.
 */
export async function savePhotoFile(bytes: Buffer): Promise<{ storageKey: string; thumbnailKey: string }> {
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

  await backend.put(storageKey, optimized);
  await backend.put(thumbnailKey, thumbnail);

  return { storageKey, thumbnailKey };
}

export async function readPhotoFile(storageKey: string): Promise<Buffer> {
  return backend.get(storageKey);
}

/** Copies an existing photo's files under fresh keys — used when duplicating a room/inspection.
 * Backend-agnostic (works for both Tigris and local): reads the bytes through the same
 * `backend.get`/`put` contract everything else here uses, rather than touching the filesystem
 * directly, so it keeps working if the active backend is Tigris. */
export async function duplicatePhotoFile(
  storageKey: string,
  thumbnailKey: string | null
): Promise<{ storageKey: string; thumbnailKey: string | null }> {
  const id = randomUUID();
  const newStorageKey = `${id}.jpg`;
  await backend.put(newStorageKey, await backend.get(storageKey));

  let newThumbnailKey: string | null = null;
  if (thumbnailKey) {
    newThumbnailKey = `${id}.thumb.jpg`;
    await backend.put(newThumbnailKey, await backend.get(thumbnailKey));
  }
  return { storageKey: newStorageKey, thumbnailKey: newThumbnailKey };
}

export async function deletePhotoFile(storageKey: string, thumbnailKey: string | null) {
  await Promise.all([backend.delete(storageKey), thumbnailKey ? backend.delete(thumbnailKey) : Promise.resolve()]);
}
