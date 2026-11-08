'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/common/Header';
import { getUserVideoById, loadVideoBlob } from '@/db/services/videoService';
import { getMarkersForVideo, saveSwingMarker, autoEstimateSwingMarkers } from '@/db/services/markerService';
import { SwingVideo } from '@/types/video';
import { SwingMarker, SwingPhase } from '@/types/marker';
import { DrawCanvas } from '@/components/overlay/DrawCanvas';
import { PhaseMarkerBar } from '@/components/marker/PhaseMarkerBar';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { Play, Pause, ChevronLeft, ChevronRight, Film } from 'lucide-react';

export function AnalysisClient() {
  const searchParams = useSearchParams();
  const videoId = searchParams.get('id');

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [videoData, setVideoData] = useState<SwingVideo | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [markers, setMarkers] = useState<SwingMarker[]>([]);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);

  // Load video & markers
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    if (videoId) {
      getUserVideoById(videoId).then(async (v) => {
        if (v && !cancelled) {
          setVideoData(v);
          const blob = await loadVideoBlob(v);
          if (blob && !cancelled) {
            url = URL.createObjectURL(blob);
            setBlobUrl(url);
          }
        }
      });
      getMarkersForVideo(videoId).then(setMarkers);
    }

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [videoId]);

  // Render initial frame preview when blobUrl loads
  useEffect(() => {
    if (blobUrl && videoRef.current) {
      const v = videoRef.current;
      const handleLoadedData = () => {
        if (v.paused && v.currentTime === 0) {
          try {
            v.currentTime = 0.001;
          } catch (e) {
            console.warn('Failed to seek video preview frame:', e);
          }
        }
      };
      if (v.readyState >= 2) {
        handleLoadedData();
      } else {
        v.addEventListener('loadeddata', handleLoadedData, { once: true });
      }
      return () => {
        v.removeEventListener('loadeddata', handleLoadedData);
      };
    }
  }, [blobUrl]);

  // Sync Video Time Loop
  useEffect(() => {
    let animId: number;
    const loop = () => {
      if (videoRef.current && !videoRef.current.paused) {
        setCurrentTime(videoRef.current.currentTime);
      }
      if (isPlaying) {
        animId = requestAnimationFrame(loop);
      }
    };
    if (isPlaying) {
      animId = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const seekTo = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const stepFrame = (direction: 'forward' | 'backward') => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    const delta = direction === 'forward' ? 1 / 30 : -1 / 30;
    const target = Math.max(0, Math.min(duration || 100, videoRef.current.currentTime + delta));
    videoRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleTagPhase = async (phase: SwingPhase, timestamp: number) => {
    if (!videoId) return;
    const marker = await saveSwingMarker(videoId, phase, timestamp);
    setMarkers((prev) => [...prev.filter((m) => m.phase !== phase), marker]);
  };

  const handleAutoEstimate = async () => {
    if (videoId && duration) {
      const estimated = await autoEstimateSwingMarkers(videoId, duration);
      setMarkers(estimated);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas">
      <Header title={videoData ? videoData.filename : '揮桿標記分析'} showBack />

      {/* Main Single Video Container with Overlay */}
      <div className="theme-dark relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {blobUrl ? (
          <video
            ref={videoRef}
            src={blobUrl}
            preload="auto"
            playsInline
            webkit-playsinline="true"
            muted
            onLoadedMetadata={() => {
              if (!videoRef.current) return;
              // MediaRecorder WebM files report Infinity until fully read.
              const measured = videoRef.current.duration;
              setDuration(Number.isFinite(measured) ? measured : videoData?.duration ?? 0);
            }}
            className="w-full h-full object-contain pointer-events-none"
          />
        ) : (
          <div className="text-center p-6 text-label-3 text-xs flex flex-col items-center gap-2">
            <Film className="w-8 h-8 text-label-3" />
            <span>載入影片檔中...</span>
          </div>
        )}

        {/* Draw Canvas Overlay */}
        <DrawCanvas active={true} />
      </div>

      {/* Phase Markers Toolbar */}
      <PhaseMarkerBar
        markers={markers}
        currentTime={currentTime}
        onTagPhase={handleTagPhase}
        onJumpToTimestamp={seekTo}
        onAutoEstimate={handleAutoEstimate}
      />

      {/* Video Seek & Control Dock */}
      <div className="bg-surface border-t border-separator p-3 flex flex-col gap-2.5">
        <div className="flex items-center gap-3 px-1">
          <span className="text-caption tabular-nums text-tint font-semibold w-12">
            {currentTime.toFixed(2)}s
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.033}
            value={currentTime}
            onChange={(e) => seekTo(parseFloat(e.target.value))}
            className="flex-1 accent-tint-fill h-2 bg-fill rounded-lg cursor-pointer"
          />
          <span className="text-caption tabular-nums text-label-2 w-12 text-right">
            {(duration || 0).toFixed(2)}s
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          {/* Speed options */}
          <SegmentedControl
            value={playbackRate}
            onChange={changeSpeed}
            itemClassName="px-2 py-1 text-caption"
            options={[0.25, 0.5, 1.0].map((rate) => ({ value: rate, label: `${rate}x` }))}
          />

          <div className="flex items-center gap-2">
            <button
              onClick={() => stepFrame('backward')}
              aria-label="後退 1 幀"
              className="p-2.5 rounded-xl bg-fill text-label"
            >
              <ChevronLeft className="w-5 h-5 text-tint" />
            </button>

            <button
              onClick={togglePlay}
              aria-label={isPlaying ? '暫停' : '播放'}
              className="w-12 h-12 rounded-full bg-tint-fill text-on-tint flex items-center justify-center"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current text-on-tint" />
              ) : (
                <Play className="w-6 h-6 fill-current text-on-tint ml-0.5" />
              )}
            </button>

            <button
              onClick={() => stepFrame('forward')}
              aria-label="前進 1 幀"
              className="p-2.5 rounded-xl bg-fill text-label"
            >
              <ChevronRight className="w-5 h-5 text-tint" />
            </button>
          </div>

          <div className="w-16" />
        </div>
      </div>
    </div>
  );
}
