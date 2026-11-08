// Global in-memory cache for video poster data URLs to ensure instant preview rendering.
// Holds only data URLs: blob: URLs are revoked when a player switches videos.
const posterCache = new Map<string, string>();

/**
 * Extract a fast JPEG Data URL from a video Blob at timestamp 0.05s
 */
export function extractVideoPoster(videoId: string, blob: Blob): Promise<string> {
  if (!videoId || !blob) return Promise.resolve('');

  // Return cached poster immediately if available
  if (posterCache.has(videoId)) {
    return Promise.resolve(posterCache.get(videoId)!);
  }

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    const url = URL.createObjectURL(blob);
    video.src = url;

    let resolved = false;
    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        URL.revokeObjectURL(url);
        video.remove();
      }
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve('');
    }, 2500);

    video.onloadeddata = () => {
      try {
        video.currentTime = 0.05;
      } catch {
        // ignore seek errors
      }
    };

    video.onseeked = () => {
      if (resolved) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        const ctx = canvas.getContext('2d');
        if (ctx && canvas.width > 0 && canvas.height > 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          posterCache.set(videoId, dataUrl);
          clearTimeout(timer);
          cleanup();
          resolve(dataUrl);
          return;
        }
      } catch (e) {
        console.warn('Poster extraction error:', e);
      }
      clearTimeout(timer);
      cleanup();
      resolve('');
    };

    video.onerror = () => {
      clearTimeout(timer);
      cleanup();
      resolve('');
    };
  });
}

/**
 * Synchronously get poster from cache if available
 */
export function getCachedPoster(videoId: string): string | null {
  return posterCache.get(videoId) || null;
}
