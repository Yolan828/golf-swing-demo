'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/common/Header';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { useDualVideoSync } from '@/hooks/useDualVideoSync';
import { VideoControls } from '@/components/video/VideoControls';
import { PhaseMarkerBar } from '@/components/marker/PhaseMarkerBar';
import { DrawCanvas, DrawToolbar } from '@/components/overlay/DrawCanvas';
import { getMarkersForVideo, saveSwingMarker, autoEstimateSwingMarkers } from '@/db/services/markerService';
import { loadVideoBlob } from '@/db/services/videoService';
import { extractVideoPoster, getCachedPoster } from '@/utils/posterCache';
import { SwingMarker, SwingPhase } from '@/types/marker';
import { Trophy, Video as VideoIcon, AlertTriangle } from 'lucide-react';

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-label-2">載入雙片比對模組...</div>}>
      <CompareContent />
    </Suspense>
  );
}

function CompareContent() {
  const searchParams = useSearchParams();
  const initialUserVideoId = searchParams.get('userVideoId');
  const initialProVideoId = searchParams.get('proVideoId');

  const userVideos = useLiveQuery(() => db.userVideos.orderBy('createdAt').reverse().toArray(), []);
  const benchmarkVideos = useLiveQuery(() => db.benchmarkVideos.orderBy('createdAt').reverse().toArray(), []);

  // Explicit picks win; until then the sides follow the URL and the newest videos.
  const [pickedLeftId, setPickedLeftId] = useState<string>('');
  const [pickedRightId, setPickedRightId] = useState<string>('');
  const selectedLeftId = pickedLeftId || initialUserVideoId || userVideos?.[0]?.id || '';
  const selectedRightId = pickedRightId || initialProVideoId || benchmarkVideos?.[0]?.id || userVideos?.[0]?.id || '';

  const [leftBlobUrl, setLeftBlobUrl] = useState<string | null>(null);
  const [rightBlobUrl, setRightBlobUrl] = useState<string | null>(null);

  const [leftPosterUrl, setLeftPosterUrl] = useState<string | null>(null);
  const [rightPosterUrl, setRightPosterUrl] = useState<string | null>(null);

  const [leftVideoError, setLeftVideoError] = useState<boolean>(false);
  const [rightVideoError, setRightVideoError] = useState<boolean>(false);

  const [leftMarkers, setLeftMarkers] = useState<SwingMarker[]>([]);
  const [rightMarkers, setRightMarkers] = useState<SwingMarker[]>([]);

  // Active Marker Tab ('left' | 'right')
  const [activeMarkerTab, setActiveMarkerTab] = useState<'left' | 'right'>('left');

  // Dual Video Sync Hook
  const {
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
  } = useDualVideoSync({
    fps: 30,
    leftMarkers,
    rightMarkers,
  });

  // Shared Brush Toolbar State for Dual Screens
  const [drawColor, setDrawColor] = useState<string>('#30D158');
  const [drawVisible, setDrawVisible] = useState<boolean>(true);
  const [drawExpanded, setDrawExpanded] = useState<boolean>(false);
  const [drawClearTrigger, setDrawClearTrigger] = useState<number>(0);

  // Track Object URLs to safely revoke previous ones without breaking active playback
  const activeLeftUrlRef = useRef<string | null>(null);
  const activeRightUrlRef = useRef<string | null>(null);
  const activeLeftPosterRef = useRef<string | null>(null);
  const activeRightPosterRef = useRef<string | null>(null);

  const currentLeftLoadedIdRef = useRef<string | null>(null);
  const currentRightLoadedIdRef = useRef<string | null>(null);

  const pickLeftVideo = (id: string) => {
    setPickedLeftId(id);
    setLeftVideoError(false);
  };

  const pickRightVideo = (id: string) => {
    setPickedRightId(id);
    setRightVideoError(false);
  };

  // The poster only covers the player until its first seek paints a real frame;
  // left on top while paused, it would hide scrubbing and frame stepping.
  const [leftSeekedUrl, setLeftSeekedUrl] = useState<string | null>(null);
  const [rightSeekedUrl, setRightSeekedUrl] = useState<string | null>(null);

  // A cached poster gives a 0ms preview while the selected video loads.
  const leftPoster = getCachedPoster(selectedLeftId) ?? leftPosterUrl;
  const rightPoster = getCachedPoster(selectedRightId) ?? rightPosterUrl;

  // Handle Left Video Blob URL, Poster & Markers
  useEffect(() => {
    if (!selectedLeftId || !userVideos || userVideos.length === 0) {
      return;
    }

    if (currentLeftLoadedIdRef.current === selectedLeftId && leftBlobUrl) {
      return;
    }

    const vid = userVideos.find((v) => v.id === selectedLeftId);
    let cancelled = false;
    (vid ? loadVideoBlob(vid) : Promise.resolve(undefined)).then((blob) => {
      if (cancelled) return;
      if (vid && blob) {
        currentLeftLoadedIdRef.current = selectedLeftId;
        if (activeLeftUrlRef.current) {
          URL.revokeObjectURL(activeLeftUrlRef.current);
        }
        const newUrl = URL.createObjectURL(blob);
        activeLeftUrlRef.current = newUrl;
        setLeftBlobUrl(newUrl);

        if (activeLeftPosterRef.current) {
          URL.revokeObjectURL(activeLeftPosterRef.current);
          activeLeftPosterRef.current = null;
        }

        if (vid.thumbnailBlob) {
          const pUrl = URL.createObjectURL(vid.thumbnailBlob);
          activeLeftPosterRef.current = pUrl;
          setLeftPosterUrl(pUrl);
        } else {
          extractVideoPoster(selectedLeftId, blob).then((pUrl) => {
            if (pUrl) setLeftPosterUrl(pUrl);
          });
        }
        getMarkersForVideo(selectedLeftId).then(setLeftMarkers);
      } else {
        currentLeftLoadedIdRef.current = null;
        setLeftBlobUrl(null);
        setLeftPosterUrl(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedLeftId, userVideos, leftBlobUrl]);

  // Cleanup left object urls on component unmount
  useEffect(() => {
    return () => {
      if (activeLeftUrlRef.current) {
        URL.revokeObjectURL(activeLeftUrlRef.current);
        activeLeftUrlRef.current = null;
      }
      if (activeLeftPosterRef.current) {
        URL.revokeObjectURL(activeLeftPosterRef.current);
        activeLeftPosterRef.current = null;
      }
    };
  }, []);

  // Handle Right Video URL, Poster & Markers
  useEffect(() => {
    if (!selectedRightId) return;

    if (currentRightLoadedIdRef.current === selectedRightId && rightBlobUrl) {
      return;
    }

    let foundVid = benchmarkVideos?.find((b) => b.id === selectedRightId);
    if (!foundVid && userVideos) {
      foundVid = userVideos.find((v) => v.id === selectedRightId);
    }

    const vid = foundVid;
    let cancelled = false;
    (vid ? loadVideoBlob(vid) : Promise.resolve(undefined)).then((blob) => {
      if (cancelled) return;
      if (vid && blob) {
        currentRightLoadedIdRef.current = selectedRightId;
        if (activeRightUrlRef.current) {
          URL.revokeObjectURL(activeRightUrlRef.current);
        }
        const newUrl = URL.createObjectURL(blob);
        activeRightUrlRef.current = newUrl;
        setRightBlobUrl(newUrl);

        if (activeRightPosterRef.current) {
          URL.revokeObjectURL(activeRightPosterRef.current);
          activeRightPosterRef.current = null;
        }

        if (vid.thumbnailBlob) {
          const pUrl = URL.createObjectURL(vid.thumbnailBlob);
          activeRightPosterRef.current = pUrl;
          setRightPosterUrl(pUrl);
        } else {
          extractVideoPoster(selectedRightId, blob).then((pUrl) => {
            if (pUrl) setRightPosterUrl(pUrl);
          });
        }
        getMarkersForVideo(selectedRightId).then(setRightMarkers);
      } else {
        currentRightLoadedIdRef.current = null;
        setRightBlobUrl(null);
        setRightPosterUrl(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedRightId, benchmarkVideos, userVideos, rightBlobUrl]);

  // Cleanup right object urls on component unmount
  useEffect(() => {
    return () => {
      if (activeRightUrlRef.current) {
        URL.revokeObjectURL(activeRightUrlRef.current);
        activeRightUrlRef.current = null;
      }
      if (activeRightPosterRef.current) {
        URL.revokeObjectURL(activeRightPosterRef.current);
        activeRightPosterRef.current = null;
      }
    };
  }, []);

  // Render initial frame preview when leftBlobUrl loads
  useEffect(() => {
    if (leftBlobUrl && leftVideoRef.current) {
      const v = leftVideoRef.current;
      const handleLoadedData = () => {
        if (v.paused && v.currentTime === 0) {
          try {
            v.currentTime = 0.001;
          } catch (e) {
            console.warn('Failed to seek left video preview frame:', e);
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
  }, [leftBlobUrl, leftVideoRef]);

  // Render initial frame preview when rightBlobUrl loads
  useEffect(() => {
    if (rightBlobUrl && rightVideoRef.current) {
      const v = rightVideoRef.current;
      const handleLoadedData = () => {
        if (v.paused && v.currentTime === 0) {
          try {
            v.currentTime = 0.001;
          } catch (e) {
            console.warn('Failed to seek right video preview frame:', e);
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
  }, [rightBlobUrl, rightVideoRef]);

  const handleTagPhase = async (phase: SwingPhase, timestamp: number, side?: 'left' | 'right') => {
    const targetSide = side || activeMarkerTab;
    const targetId = targetSide === 'left' ? selectedLeftId : selectedRightId;
    if (targetId) {
      const newMarker = await saveSwingMarker(targetId, phase, timestamp);
      if (targetSide === 'left') {
        setLeftMarkers((prev) => [...prev.filter((m) => m.phase !== phase), newMarker]);
      } else {
        setRightMarkers((prev) => [...prev.filter((m) => m.phase !== phase), newMarker]);
      }
    }
  };

  const handleAutoEstimate = async (side?: 'left' | 'right') => {
    const targetSide = side || activeMarkerTab;
    const targetId = targetSide === 'left' ? selectedLeftId : selectedRightId;
    const measured = (targetSide === 'left' ? leftVideoRef : rightVideoRef).current?.duration;
    const stored = [...(userVideos ?? []), ...(benchmarkVideos ?? [])].find((v) => v.id === targetId)?.duration;
    // MediaRecorder WebM files report Infinity until fully read.
    const targetDuration = measured && Number.isFinite(measured) ? measured : stored ?? duration;

    if (targetId && targetDuration) {
      const estimated = await autoEstimateSwingMarkers(targetId, targetDuration);
      if (targetSide === 'left') {
        setLeftMarkers(estimated);
      } else {
        setRightMarkers(estimated);
      }
    }
  };

  const handleVideoLoad = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    updateDuration();
    const vid = e.currentTarget;
    if (vid.paused && (vid.currentTime === 0 || vid.currentTime < 0.1)) {
      try {
        vid.currentTime = 0.1;
      } catch (err) {
        console.warn('Initial seek to 0.1s failed:', err);
      }
    }
  }, [updateDuration]);

  const handleJumpToTimestamp = (timestamp: number, side?: 'left' | 'right') => {
    const targetSide = side || activeMarkerTab;
    seekTo(timestamp, targetSide);
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-canvas">
      <Header title="揮桿動作雙片比對" showBack />

      {/* Selectors Bar */}
      <div className="bg-surface border-b border-separator p-2.5 grid grid-cols-2 gap-2 text-xs font-semibold shrink-0">
        {/* Left Selector (User Video) */}
        <div>
          <label className="block text-caption-2 text-label-2 mb-1 flex items-center gap-1">
            <VideoIcon className="w-3 h-3" /> 左側：自己的揮桿
          </label>
          <select
            value={selectedLeftId}
            onChange={(e) => pickLeftVideo(e.target.value)}
            className="w-full bg-fill text-label rounded-xl p-2 font-medium truncate focus:ring-1 focus:ring-tint"
          >
            {userVideos && userVideos.length > 0 ? (
              userVideos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.filename} ({v.clubType})
                </option>
              ))
            ) : (
              <option value="">(尚未上傳任何影片)</option>
            )}
          </select>
        </div>

        {/* Right Selector (Benchmark Video / Other User Video) */}
        <div>
          <label className="block text-caption-2 text-label-2 mb-1 flex items-center gap-1">
            <Trophy className="w-3 h-3" /> 右側：基準動作 / 比對檔
          </label>
          <select
            value={selectedRightId}
            onChange={(e) => pickRightVideo(e.target.value)}
            className="w-full bg-fill text-label rounded-xl p-2 font-medium truncate focus:ring-1 focus:ring-tint"
          >
            {benchmarkVideos && benchmarkVideos.length > 0 && (
              <optgroup label="⭐ 自訂基準/職業影片庫">
                {benchmarkVideos.map((b) => (
                  <option key={b.id} value={b.id}>
                    ⭐ {b.filename} ({b.clubType})
                  </option>
                ))}
              </optgroup>
            )}
            {userVideos && userVideos.length > 0 && (
              <optgroup label="📹 我的其他揮桿記錄">
                {userVideos.map((v) => (
                  <option key={v.id} value={v.id}>
                    📹 {v.filename} ({v.clubType})
                  </option>
                ))}
              </optgroup>
            )}
            {(!benchmarkVideos || benchmarkVideos.length === 0) && (!userVideos || userVideos.length === 0) && (
              <option value="">(請先上傳基準或自己的揮桿影片)</option>
            )}
          </select>
        </div>
      </div>

      {/* Dual Video Screen Container */}
      <div className="flex-1 theme-dark relative bg-black grid grid-cols-2 divide-x divide-white/15 overflow-hidden min-h-[350px]">
        {/* Left Screen */}
        <div className="relative h-full flex items-center justify-center bg-black overflow-hidden">
          {leftBlobUrl && !leftVideoError ? (
            <>
              <video
                ref={leftVideoRef}
                src={leftBlobUrl || undefined}
                poster={leftPoster || undefined}
                preload="auto"
                playsInline
                webkit-playsinline="true"
                muted
                onLoadedMetadata={handleVideoLoad}
                onCanPlay={handleVideoLoad}
                onSeeked={() => setLeftSeekedUrl(leftBlobUrl)}
                onError={() => setLeftVideoError(true)}
                className="w-full h-full object-contain pointer-events-none z-10"
              />
              {!isPlaying && leftPoster && leftSeekedUrl !== leftBlobUrl && (
                <img
                  src={leftPoster}
                  alt="左側揮桿預覽圖"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none z-15 bg-black"
                />
              )}
            </>
          ) : (
            <div className="p-4 text-center text-label-3 text-xs flex flex-col items-center gap-2">
              {leftVideoError ? (
                <>
                  <AlertTriangle className="w-6 h-6 text-warning" />
                  <span className="text-warning">左側影片載入失敗，請重新選取</span>
                </>
              ) : (
                '請在上方選取自己的揮桿影片'
              )}
            </div>
          )}
          <DrawCanvas
            active={true}
            showToolbar={false}
            color={drawColor}
            visible={drawVisible}
            isExpanded={drawExpanded}
            clearTrigger={drawClearTrigger}
          />
          <span className="absolute bottom-2 left-2 z-30 text-caption-2 font-semibold tabular-nums px-2 py-0.5 rounded bg-black/60 text-white pointer-events-none">
            我的揮桿
          </span>
        </div>

        {/* Right Screen */}
        <div className="relative h-full flex items-center justify-center bg-black overflow-hidden">
          {rightBlobUrl && !rightVideoError ? (
            <>
              <video
                ref={rightVideoRef}
                src={rightBlobUrl || undefined}
                poster={rightPoster || undefined}
                preload="auto"
                playsInline
                webkit-playsinline="true"
                muted
                onLoadedMetadata={handleVideoLoad}
                onCanPlay={handleVideoLoad}
                onSeeked={() => setRightSeekedUrl(rightBlobUrl)}
                onError={() => setRightVideoError(true)}
                className="w-full h-full object-contain pointer-events-none z-10"
              />
              {!isPlaying && rightPoster && rightSeekedUrl !== rightBlobUrl && (
                <img
                  src={rightPoster}
                  alt="右側比對預覽圖"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none z-15 bg-black"
                />
              )}
            </>
          ) : (
            <div className="p-4 text-center text-label-3 text-xs flex flex-col items-center gap-2">
              {rightVideoError ? (
                <>
                  <AlertTriangle className="w-6 h-6 text-warning" />
                  <span className="text-warning">右側影片載入失敗，請檢查資源</span>
                </>
              ) : (
                '請選取基準或比對影片'
              )}
            </div>
          )}
          <DrawCanvas
            active={true}
            showToolbar={false}
            color={drawColor}
            visible={drawVisible}
            isExpanded={drawExpanded}
            clearTrigger={drawClearTrigger}
          />
          <span className="absolute bottom-2 right-2 z-30 text-caption-2 font-semibold tabular-nums px-2 py-0.5 rounded bg-black/60 text-white pointer-events-none">
            比對基準
          </span>
        </div>

        {/* Single Shared Floating Brush Toolbar for Dual Comparison */}
        <DrawToolbar
          color={drawColor}
          onColorChange={setDrawColor}
          visible={drawVisible}
          onVisibleChange={setDrawVisible}
          isExpanded={drawExpanded}
          onExpandedChange={setDrawExpanded}
          onClear={() => setDrawClearTrigger((prev) => prev + 1)}
        />
      </div>

      {/* Phase Markers Quick Jump & Tabbed Bar */}
      <PhaseMarkerBar
        leftMarkers={leftMarkers}
        rightMarkers={rightMarkers}
        activeTab={activeMarkerTab}
        onTabChange={setActiveMarkerTab}
        currentTime={currentTime}
        isPhaseWarpEnabled={isPhaseWarpEnabled}
        onTogglePhaseWarp={() => setIsPhaseWarpEnabled(!isPhaseWarpEnabled)}
        onTagPhase={handleTagPhase}
        onJumpToTimestamp={handleJumpToTimestamp}
        onAutoEstimate={handleAutoEstimate}
      />

      {/* Main Dual Video Controls */}
      <VideoControls
        isPlaying={isPlaying}
        playbackRate={playbackRate}
        currentTime={currentTime}
        duration={duration}
        isSyncLinked={isSyncLinked}
        onTogglePlay={togglePlay}
        onSetPlaybackRate={setPlaybackRate}
        onSeek={seekTo}
        onStepFrame={stepFrame}
        onToggleSyncLink={() => setIsSyncLinked(!isSyncLinked)}
      />
    </div>
  );
}


