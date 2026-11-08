'use client';

import React from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Link2, Link2Off } from 'lucide-react';
import { PlaybackRate } from '@/hooks/useDualVideoSync';
import { SegmentedControl } from '@/components/common/SegmentedControl';

interface VideoControlsProps {
  isPlaying: boolean;
  playbackRate: PlaybackRate;
  currentTime: number;
  duration: number;
  isSyncLinked: boolean;
  onTogglePlay: () => void;
  onSetPlaybackRate: (rate: PlaybackRate) => void;
  onSeek: (time: number) => void;
  onStepFrame: (direction: 'forward' | 'backward') => void;
  onToggleSyncLink: () => void;
}

export function VideoControls({
  isPlaying,
  playbackRate,
  currentTime,
  duration,
  isSyncLinked,
  onTogglePlay,
  onSetPlaybackRate,
  onSeek,
  onStepFrame,
  onToggleSyncLink,
}: VideoControlsProps) {
  const speeds: PlaybackRate[] = [0.25, 0.5, 1.0];

  const formatTime = (seconds: number) => {
    const safeSec = Math.max(0, isNaN(seconds) ? 0 : seconds);
    const mins = Math.floor(safeSec / 60);
    const secs = (safeSec % 60).toFixed(2);
    return `${mins}:${Number(secs) < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="bg-surface border-t border-separator p-3 flex flex-col gap-2.5 rounded-t-2xl">
      {/* Time Seekbar Slider */}
      <div className="flex items-center gap-3 px-1">
        <span className="text-caption tabular-nums text-tint font-semibold w-12">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.033}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="flex-1 accent-tint-fill h-2 bg-fill rounded-lg cursor-pointer"
        />
        <span className="text-caption tabular-nums text-label-2 w-12 text-right">
          {formatTime(duration)}
        </span>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-between gap-2 pt-1">
        {/* Sync Link Toggle */}
        <button
          onClick={onToggleSyncLink}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${
            isSyncLinked
              ? 'bg-tint-soft border-transparent text-tint'
              : 'bg-fill border-transparent text-label-2'
          }`}
          title={isSyncLinked ? '雙影片同步中' : '獨立播放中'}
        >
          {isSyncLinked ? <Link2 className="w-4 h-4" /> : <Link2Off className="w-4 h-4" />}
          <span className="hidden sm:inline">{isSyncLinked ? '連動中' : '解聯'}</span>
        </button>

        {/* Frame Step Backward */}
        <button
          onClick={() => onStepFrame('backward')}
          className="p-2.5 rounded-xl bg-fill text-label hover:bg-fill-strong"
          title="後退 1 幀 (1 Frame Backward)"
        >
          <ChevronLeft className="w-5 h-5 text-tint" />
        </button>

        {/* Play / Pause Toggle Button */}
        <button
          onClick={onTogglePlay}
          aria-label={isPlaying ? '暫停' : '播放'}
          className="w-13 h-13 px-5 py-2.5 rounded-full bg-tint-fill text-on-tint font-bold flex items-center justify-center"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 fill-current text-on-tint" />
          ) : (
            <Play className="w-6 h-6 fill-current text-on-tint ml-0.5" />
          )}
        </button>

        {/* Frame Step Forward */}
        <button
          onClick={() => onStepFrame('forward')}
          className="p-2.5 rounded-xl bg-fill text-label hover:bg-fill-strong"
          title="前進 1 幀 (1 Frame Forward)"
        >
          <ChevronRight className="w-5 h-5 text-tint" />
        </button>

        {/* Speed Selector Buttons */}
        <SegmentedControl
          value={playbackRate}
          onChange={onSetPlaybackRate}
          itemClassName="px-2 py-1 text-caption"
          options={speeds.map((rate) => ({ value: rate, label: `${rate}x` }))}
        />
      </div>
    </div>
  );
}
