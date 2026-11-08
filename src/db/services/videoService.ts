import type { Table } from 'dexie';
import { db } from '../index';
import { SwingVideo, ClubType, CameraAngle } from '@/types/video';

export const MAX_USER_VIDEOS = 3;
export const MAX_BENCHMARK_VIDEOS = 3;
const MAX_VIDEO_FILE_MB = 150;

/** Returns a user-facing error when a picked file is too large for local storage. */
export function getVideoSizeError(bytes: number): string | null {
  const megabytes = bytes / (1024 * 1024);
  if (megabytes <= MAX_VIDEO_FILE_MB) return null;
  return `影片檔案過大 (${megabytes.toFixed(1)} MB)。請選擇小於 ${MAX_VIDEO_FILE_MB} MB 的揮桿短片。`;
}

function isQuotaError(err: unknown): boolean {
  const { name, message } = (err ?? {}) as { name?: string; message?: string };
  return name === 'QuotaExceededError' || !!message?.includes('quota');
}

/**
 * WebKit can fail to persist a Blob/File with "Error preparing Blob/File data
 * to be stored in object store" (e.g. Safari private tabs, WebKit bug 268037).
 */
function isBlobPersistFailure(err: unknown): boolean {
  const { name, message } = (err ?? {}) as { name?: string; message?: string };
  return name === 'UnknownError' || /preparing Blob/i.test(message ?? '');
}

/**
 * Store a video, falling back to raw ArrayBuffers when the browser can't persist Blobs.
 * Video bytes go in their own table so list queries don't pull them into memory.
 */
async function addVideo(table: Table<SwingVideo, string>, video: SwingVideo): Promise<void> {
  try {
    await table.add(video);
    return;
  } catch (err) {
    if (!isBlobPersistFailure(err)) throw err;
    console.warn('Blob storage failed, retrying as ArrayBuffer:', err);
  }

  const { blob, thumbnailBlob, ...metadata } = video;
  // Read before opening the transaction: awaiting non-IndexedDB work inside one closes it.
  const bytes = await blob!.arrayBuffer();
  const thumbnailBytes = await thumbnailBlob?.arrayBuffer();

  await db.transaction('rw', table, db.videoBytes, async () => {
    await db.videoBytes.add({ id: video.id, bytes });
    await table.add({ ...metadata, thumbnailBytes });
  });
}

/**
 * Get a playable Blob for a video, wherever its bytes were stored.
 */
export async function loadVideoBlob(
  video: Pick<SwingVideo, 'id' | 'blob' | 'mimeType'>
): Promise<Blob | undefined> {
  if (video.blob) return video.blob;
  const record = await db.videoBytes.get(video.id);
  return record ? new Blob([record.bytes], { type: video.mimeType }) : undefined;
}

/**
 * Generate a thumbnail blob from a video blob
 */
export async function generateThumbnail(videoBlob: Blob): Promise<Blob | undefined> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(videoBlob);
    
    let isResolved = false;
    const cleanup = () => {
      if (!isResolved) {
        isResolved = true;
        URL.revokeObjectURL(url);
      }
    };

    // 3-second timeout safeguard to prevent hanging on unsupported codecs or browser restriction
    const timer = setTimeout(() => {
      if (!isResolved) {
        cleanup();
        resolve(undefined);
      }
    }, 3000);

    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.crossOrigin = 'anonymous';

    video.onloadeddata = () => {
      video.currentTime = Math.min(1.0, (video.duration || 1.0) / 2);
    };

    video.onseeked = () => {
      if (isResolved) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = (video.videoHeight / video.videoWidth) * 320 || 240;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            clearTimeout(timer);
            cleanup();
            resolve(blob || undefined);
          }, 'image/jpeg', 0.85);
        } else {
          clearTimeout(timer);
          cleanup();
          resolve(undefined);
        }
      } catch {
        clearTimeout(timer);
        cleanup();
        resolve(undefined);
      }
    };

    video.onerror = () => {
      clearTimeout(timer);
      cleanup();
      resolve(undefined);
    };
  });
}

/**
 * Save a new user video to IndexedDB
 */
export async function saveUserVideo(
  fileOrBlob: Blob,
  filename: string,
  clubType: ClubType = 'Driver',
  cameraAngle: CameraAngle = 'DownTheLine',
  duration: number = 0
): Promise<SwingVideo> {
  const count = await db.userVideos.count();
  if (count >= MAX_USER_VIDEOS) {
    throw new Error(`已達到影片數量上限 (${MAX_USER_VIDEOS} 支)。請先刪除舊影片再新增。`);
  }

  const id = `user-video-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const thumbnailBlob = await generateThumbnail(fileOrBlob);

  const video: SwingVideo = {
    id,
    filename: filename || `Golf_Swing_${new Date().toISOString().slice(0, 10)}.mp4`,
    blob: fileOrBlob,
    mimeType: fileOrBlob.type || 'video/mp4',
    createdAt: Date.now(),
    duration: duration || 5.0,
    size: fileOrBlob.size,
    clubType,
    cameraAngle,
    thumbnailBlob,
  };

  try {
    await addVideo(db.userVideos, video);
  } catch (err) {
    if (isQuotaError(err)) {
      throw new Error('瀏覽器本地儲存空間不足 (QuotaExceededError)，請先清理快取或刪除舊影片。');
    }
    throw err;
  }
  return video;
}

/**
 * Delete a user video and its associated markers
 */
export async function deleteUserVideo(id: string): Promise<void> {
  await db.transaction('rw', db.userVideos, db.videoBytes, db.swingMarkers, async () => {
    await db.userVideos.delete(id);
    await db.videoBytes.delete(id);
    await db.swingMarkers.where('videoId').equals(id).delete();
  });
}

/**
 * Get all user videos
 */
export async function getAllUserVideos(): Promise<SwingVideo[]> {
  return await db.userVideos.orderBy('createdAt').reverse().toArray();
}

/**
 * Get single user video by ID
 */
export async function getUserVideoById(id: string): Promise<SwingVideo | undefined> {
  return await db.userVideos.get(id);
}

/**
 * Save a new benchmark/reference video to IndexedDB
 */
export async function saveBenchmarkVideo(
  fileOrBlob: Blob,
  filename: string,
  clubType: ClubType = 'Driver',
  cameraAngle: CameraAngle = 'DownTheLine',
  duration: number = 0
): Promise<SwingVideo> {
  const count = await db.benchmarkVideos.count();
  if (count >= MAX_BENCHMARK_VIDEOS) {
    throw new Error(`基準庫已達到影片數量上限 (${MAX_BENCHMARK_VIDEOS} 支)。若要上傳更多，請先將原本的影片刪除。`);
  }

  const id = `benchmark-video-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const thumbnailBlob = await generateThumbnail(fileOrBlob);

  const video: SwingVideo = {
    id,
    filename: filename || `Benchmark_${new Date().toISOString().slice(0, 10)}.mp4`,
    blob: fileOrBlob,
    mimeType: fileOrBlob.type || 'video/mp4',
    createdAt: Date.now(),
    duration: duration || 5.0,
    size: fileOrBlob.size,
    clubType,
    cameraAngle,
    thumbnailBlob,
  };

  try {
    await addVideo(db.benchmarkVideos, video);
  } catch (err) {
    if (isQuotaError(err)) {
      throw new Error('瀏覽器本地儲存空間不足 (QuotaExceededError)，請先清理舊影片。');
    }
    throw err;
  }
  return video;
}

/**
 * Delete a benchmark video and its associated markers
 */
export async function deleteBenchmarkVideo(id: string): Promise<void> {
  await db.transaction('rw', db.benchmarkVideos, db.videoBytes, db.swingMarkers, async () => {
    await db.benchmarkVideos.delete(id);
    await db.videoBytes.delete(id);
    await db.swingMarkers.where('videoId').equals(id).delete();
  });
}

/**
 * Get all benchmark videos
 */
export async function getAllBenchmarkVideos(): Promise<SwingVideo[]> {
  return await db.benchmarkVideos.orderBy('createdAt').reverse().toArray();
}

/**
 * Get single benchmark video by ID
 */
export async function getBenchmarkVideoById(id: string): Promise<SwingVideo | undefined> {
  return await db.benchmarkVideos.get(id);
}
