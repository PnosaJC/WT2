// Task 1 images live in IndexedDB: localStorage (~5 MB) is far too small for pictures.

const DB_NAME = "wt2-images";
const STORE = "images";
const MAX_SIDE = 1600; // px — keeps chart labels readable while shrinking big screenshots

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("this browser can't store images"));
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error("could not open image storage"));
    };
  });
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error ?? new Error("image storage error"));
    tx.onabort = () => reject(tx.error ?? new Error("image storage was aborted (storage may be full)"));
  });
}

const urlCache = new Map<string, string>();

export async function putImage(id: string, blob: Blob): Promise<void> {
  await run("readwrite", (s) => s.put(blob, id));
}

export async function deleteImage(id: string): Promise<void> {
  await run("readwrite", (s) => s.delete(id));
  const url = urlCache.get(id);
  if (url) URL.revokeObjectURL(url);
  urlCache.delete(id);
}

/** Object URL for a stored image, or null if it isn't in this browser. */
export async function imageUrl(id: string): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached) return cached;
  const blob = await run<Blob | undefined>("readonly", (s) => s.get(id) as IDBRequest<Blob | undefined>);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

/** Shrink large images (longest side ≤ 1600 px) and re-encode them compactly. */
export async function compressImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.fillStyle = "#ffffff"; // transparent PNGs would otherwise turn black
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
  let out = await encode("image/webp");
  if (!out || out.type !== "image/webp") out = await encode("image/jpeg");
  if (!out) return file;
  // A small original can be smaller than the re-encoded copy; keep whichever is smaller.
  return scale === 1 && file.size <= out.size ? file : out;
}
