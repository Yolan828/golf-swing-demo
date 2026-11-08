import { useState, useRef, useEffect, useCallback } from 'react';
import { SwingMarker, SWING_PHASES } from '@/types/marker';

export type PlaybackRate = 0.25 | 0.5 | 1.0;

export interface DualVideoSyncOptions {
  fps?: number;
  leftMarkers?: SwingMarker[];
  rightMarkers?: SwingMarker[];
}

export function useDualVideoSync(options: DualVideoSyncOptions = {}) {
  const fps = options.fps || 30;
  const frameDuration = 1 / fps;

  const leftVideoRef = useRef<HTMLVideoElement | null>(null);
  const rightVideoRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRateState] = useState<PlaybackRate>(1.0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isSyncLinked, setIsSyncLinked] = useState<boolean>(true);
  const [isPhaseWarpEnabled, setIsPhaseWarpEnabled] = useState<boolean>(false);

  const leftMarkersRef = useRef<SwingMarker[]>(options.leftMarkers || []);
  const rightMarkersRef = useRef<SwingMarker[]>(options.rightMarkers || []);

  useEffect(() => {
    leftMarkersRef.current = options.leftMarkers || [];
  }, [options.leftMarkers]);

  useEffect(() => {
    rightMarkersRef.current = options.rightMarkers || [];
  }, [options.rightMarkers]);

  // Sync Duration when videos loaded
  const updateDuration = useCallback(() => {
    // Not finite when metadata is missing, or Infinity for MediaRecorder WebM files.
    const usable = (d: number | undefined) => (d && Number.isFinite(d) ? d : 0);
    const maxDuration = Math.max(usable(leftVideoRef.current?.duration), usable(rightVideoRef.current?.duration));
    if (maxDuration > 0) {
      setDuration(maxDuration);
    }
  }, []);

  // Play / Pause toggle
  const togglePlay = useCallback(() => {
    const v1 = leftVideoRef.current;
    const v2 = rightVideoRef.current;
    if (!v1 && !v2) return;

    if (isPlaying) {
      if (v1) v1.pause();
      if (v2) v2.pause();
      setIsPlaying(false);
    } else {
      if (isSyncLinked && v1 && v2 && !isNaN(v1.currentTime)) {
        try {
          v2.currentTime = v1.currentTime;
        } catch (e) {
          console.warn('Failed to sync initial timestamp:', e);
        }
      }
      const p1 = v1 ? v1.play().catch((err) => console.warn('Left video play prevented:', err)) : Promise.resolve();
      const p2 = v2 ? v2.play().catch((err) => console.warn('Right video play prevented:', err)) : Promise.resolve();
      Promise.all([p1, p2]).then(() => {
        setIsPlaying(true);
      });
    }
  }, [isPlaying, isSyncLinked]);

  // Set Playback Speed (0.25x, 0.5x, 1x)
  const setPlaybackRate = useCallback((rate: PlaybackRate) => {
    setPlaybackRateState(rate);
    if (leftVideoRef.current) leftVideoRef.current.playbackRate = rate;
    if (rightVideoRef.current) rightVideoRef.current.playbackRate = rate;
  }, []);

  // Seek to specific timestamp (Left video or both)
  const seekTo = useCallback((time: number, targetSide: 'left' | 'right' | 'both' = 'both') => {
    const safeTime = Math.max(0, Math.min(duration || 100, time));
    if (targetSide === 'both' || targetSide === 'left') {
      setCurrentTime(safeTime);
      if (leftVideoRef.current) {
        try { leftVideoRef.current.currentTime = safeTime; } catch {}
      }
    }
    if (targetSide === 'both' || targetSide === 'right') {
      if (rightVideoRef.current) {
        try { rightVideoRef.current.currentTime = safeTime; } catch {}
      }
    }
  }, [duration]);

  // Frame Step Forward / Backward
  const stepFrame = useCallback((direction: 'forward' | 'backward') => {
    const v1 = leftVideoRef.current;
    const v2 = rightVideoRef.current;

    v1?.pause();
    v2?.pause();
    setIsPlaying(false);

    const delta = direction === 'forward' ? frameDuration : -frameDuration;

    if (v1) {
      const targetTime1 = Math.max(0, Math.min(v1.duration || 100, v1.currentTime + delta));
      v1.currentTime = targetTime1;
      setCurrentTime(targetTime1);
      if (isSyncLinked && v2) {
        try {
          v2.currentTime = Math.max(0, Math.min(v2.duration || 100, v2.currentTime + delta));
        } catch {}
      }
    } else if (v2) {
      const targetTime2 = Math.max(0, Math.min(v2.duration || 100, v2.currentTime + delta));
      v2.currentTime = targetTime2;
      setCurrentTime(targetTime2);
    }
  }, [frameDuration, isSyncLinked]);

  // Continuously sync time slider, drift, and Piecewise Phase-Warping
  useEffect(() => {
    let animId: number;

    const syncLoop = () => {
      const v1 = leftVideoRef.current;
      const v2 = rightVideoRef.current;

      const activeVideo = (v1 && !v1.paused) ? v1 : (v2 && !v2.paused ? v2 : null);

      if (activeVideo) {
        setCurrentTime(activeVideo.currentTime);

        if (isPhaseWarpEnabled && v1 && v2 && !v1.paused && !v2.paused) {
          // --- Piecewise Phase-Warping Alignment Logic ---
          const t1 = v1.currentTime;
          const d1 = v1.duration || 1;
          const d2 = v2.duration || 1;

          // Build keypoints map [ (leftTime, rightTime) ]
          const keypoints: { tL: number; tR: number }[] = [{ tL: 0, tR: 0 }];

          SWING_PHASES.forEach((p) => {
            const mL = leftMarkersRef.current.find((m) => m.phase === p.key);
            const mR = rightMarkersRef.current.find((m) => m.phase === p.key);
            if (mL && mR) {
              keypoints.push({ tL: mL.timestamp, tR: mR.timestamp });
            }
          });

          keypoints.push({ tL: d1, tR: d2 });
          keypoints.sort((a, b) => a.tL - b.tL);

          // Find current segment interval
          let segIndex = 0;
          for (let i = 0; i < keypoints.length - 1; i++) {
            if (t1 >= keypoints[i].tL && t1 <= keypoints[i + 1].tL) {
              segIndex = i;
              break;
            }
          }

          const k1 = keypoints[segIndex];
          const k2 = keypoints[segIndex + 1] || k1;
          const dtL = k2.tL - k1.tL;
          const dtR = k2.tR - k1.tR;

          if (dtL > 0.01 && dtR > 0.01) {
            const alpha = Math.max(0, Math.min(1, (t1 - k1.tL) / dtL));
            const targetRightTime = k1.tR + alpha * dtR;
            const speedRatio = dtR / dtL;

            // Dynamically adjust right video playbackRate
            const targetRate = Math.max(0.1, Math.min(3.0, playbackRate * speedRatio));
            v2.playbackRate = targetRate;

            // Soft drift correction
            const drift = Math.abs(v2.currentTime - targetRightTime);
            if (drift > 0.08) {
              try { v2.currentTime = targetRightTime; } catch {}
            }
          }
        } else if (isSyncLinked && v1 && v2 && !v1.paused && !v2.paused) {
          // Standard linear drift correction for linked videos
          v2.playbackRate = playbackRate;
          const drift = Math.abs(v1.currentTime - v2.currentTime);
          if (drift > 0.06) {
            try { v2.currentTime = v1.currentTime; } catch {}
          }
        }
      }

      if (isPlaying) {
        animId = requestAnimationFrame(syncLoop);
      }
    };

    if (isPlaying) {
      animId = requestAnimationFrame(syncLoop);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying, isSyncLinked, isPhaseWarpEnabled, playbackRate]);

  return {
    leftVideoRef,
    rightVideoRef,
    isPlaying,
    playbackRate,
    currentTime,
    duration,
    isSyncLinked,
    setIsSyncLinked,
    isPhaseWarpEnabled,
    setIsPhaseWarpEnabled,
    togglePlay,
    setPlaybackRate,
    seekTo,
    stepFrame,
    updateDuration,
  };
}

