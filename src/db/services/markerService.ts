import { db } from '../index';
import { SwingMarker, SwingPhase, SWING_PHASES } from '@/types/marker';

export async function saveSwingMarker(
  videoId: string,
  phase: SwingPhase,
  timestamp: number
): Promise<SwingMarker> {
  const existing = await db.swingMarkers
    .where('[videoId+phase]')
    .equals([videoId, phase])
    .first();

  const id = existing ? existing.id : `marker-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const marker: SwingMarker = {
    id,
    videoId,
    phase,
    timestamp: Number(timestamp.toFixed(3)),
    createdAt: Date.now(),
  };

  await db.swingMarkers.put(marker);
  return marker;
}

export async function autoEstimateSwingMarkers(
  videoId: string,
  duration: number
): Promise<SwingMarker[]> {
  if (!videoId || !Number.isFinite(duration) || duration <= 0) return [];

  // Fixed fractions of the clip length. This is a starting point to correct by hand;
  // the video content is not analysed.
  const phaseRatios: Record<SwingPhase, number> = {
    Address: 0.15,
    TakeAway: 0.35,
    Top: 0.52,
    Downswing: 0.62,
    Impact: 0.68,
    FollowThrough: 0.88,
  };

  const now = Date.now();
  const markers: SwingMarker[] = SWING_PHASES.map((p) => ({
    id: `marker-${now}-${p.key}`,
    videoId,
    phase: p.key,
    timestamp: Number((duration * (phaseRatios[p.key] ?? 0.5)).toFixed(3)),
    createdAt: now,
  }));

  // Estimates replace everything on the video, so old rows must not survive under older ids.
  await db.transaction('rw', db.swingMarkers, async () => {
    await db.swingMarkers.where('videoId').equals(videoId).delete();
    await db.swingMarkers.bulkPut(markers);
  });

  return markers;
}

export async function getMarkersForVideo(videoId: string): Promise<SwingMarker[]> {
  return await db.swingMarkers.where('videoId').equals(videoId).toArray();
}

