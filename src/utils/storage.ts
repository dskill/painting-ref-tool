/**
 * IndexedDB storage utility for persisting app state client-side
 * Stores reference images, painting images, and alignment settings
 */

const DB_NAME = 'PaintingRefToolDB';
const DB_VERSION = 1;
const STORE_NAME = 'appState';
const STATE_KEY = 'currentSession';
const JPEG_QUALITY = 0.95;

export interface SavedPaintingTransform {
  scale: number;
  rotation: number;
  offsetXRatio: number;
  offsetYRatio: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface CapturedPaintingData {
  originalImageData: string;
  cornerPoints: Point[];
}

interface PersistedState {
  version: number;
  referenceImage: Blob | null;
  paintingImage: Blob | null;
  savedPaintingTransform: SavedPaintingTransform | null;
  capturedPaintingData: CapturedPaintingData | null;
  enableCanny: boolean;
  enableGrayscale: boolean;
  projectAspectWidth: number;
  projectAspectHeight: number;
  lastUpdated: string;
}

/**
 * Initialize IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Convert Data URL to Blob with JPEG compression
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Create an image element to load the data URL
    const img = new Image();
    img.onload = () => {
      // Create a canvas to re-encode as JPEG
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);

      // Convert to JPEG blob with compression
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Convert Blob to Data URL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Save app state to IndexedDB
 */
export async function saveAppState(
  referenceImageData: string | null,
  paintingImageData: string | null,
  savedPaintingTransform: SavedPaintingTransform | null,
  capturedPaintingData: CapturedPaintingData | null,
  enableCanny: boolean,
  enableGrayscale: boolean,
  projectAspectWidth: number,
  projectAspectHeight: number
): Promise<void> {
  try {
    const db = await openDB();

    // Convert Data URLs to Blobs with JPEG compression
    const referenceBlob = referenceImageData
      ? await dataUrlToBlob(referenceImageData)
      : null;
    const paintingBlob = paintingImageData
      ? await dataUrlToBlob(paintingImageData)
      : null;

    const state: PersistedState = {
      version: 1,
      referenceImage: referenceBlob,
      paintingImage: paintingBlob,
      savedPaintingTransform,
      capturedPaintingData,
      enableCanny,
      enableGrayscale,
      projectAspectWidth,
      projectAspectHeight,
      lastUpdated: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(state, STATE_KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to save app state:', error);
    throw error;
  }
}

/**
 * Load app state from IndexedDB
 */
export async function loadAppState(): Promise<{
  referenceImageData: string | null;
  paintingImageData: string | null;
  savedPaintingTransform: SavedPaintingTransform | null;
  capturedPaintingData: CapturedPaintingData | null;
  enableCanny: boolean;
  enableGrayscale: boolean;
  projectAspectWidth: number;
  projectAspectHeight: number;
} | null> {
  try {
    const db = await openDB();

    const state = await new Promise<PersistedState | undefined>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(STATE_KEY);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!state) {
      return null;
    }

    // Convert Blobs back to Data URLs
    const referenceImageData = state.referenceImage
      ? await blobToDataUrl(state.referenceImage)
      : null;
    const paintingImageData = state.paintingImage
      ? await blobToDataUrl(state.paintingImage)
      : null;

    return {
      referenceImageData,
      paintingImageData,
      savedPaintingTransform: state.savedPaintingTransform,
      capturedPaintingData: state.capturedPaintingData || null,
      enableCanny: state.enableCanny,
      enableGrayscale: state.enableGrayscale ?? false,
      projectAspectWidth: state.projectAspectWidth || 1,
      projectAspectHeight: state.projectAspectHeight || 1,
    };
  } catch (error) {
    console.error('Failed to load app state:', error);
    return null;
  }
}

/**
 * Clear all stored app state
 */
export async function clearAppState(): Promise<void> {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(STATE_KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to clear app state:', error);
    throw error;
  }
}

/**
 * Check available storage quota
 */
export async function checkStorageQuota(): Promise<{
  usage: number;
  quota: number;
  percentUsed: number;
} | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

      return { usage, quota, percentUsed };
    } catch (error) {
      console.error('Failed to check storage quota:', error);
      return null;
    }
  }
  return null;
}

/**
 * Request persistent storage (important for Safari)
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    try {
      const isPersisted = await navigator.storage.persist();
      return isPersisted;
    } catch (error) {
      console.error('Failed to request persistent storage:', error);
      return false;
    }
  }
  return false;
}
