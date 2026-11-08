'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SWING_PHASES, SwingPhase, SwingMarker } from '@/types/marker';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { spring } from '@/utils/springs';
import { Bookmark, Clock, RefreshCw, Zap, Video as VideoIcon, Trophy, ChevronDown, ChevronUp } from 'lucide-react';

export interface PhaseMarkerBarProps {
  markers?: SwingMarker[]; // Single video mode
  leftMarkers?: SwingMarker[]; // Dual video mode
  rightMarkers?: SwingMarker[]; // Dual video mode
  activeTab?: 'left' | 'right';
  onTabChange?: (tab: 'left' | 'right') => void;
  currentTime: number;
  isPhaseWarpEnabled?: boolean;
  onTogglePhaseWarp?: () => void;
  onTagPhase: (phase: SwingPhase, timestamp: number, side?: 'left' | 'right') => void;
  onJumpToTimestamp: (timestamp: number, side?: 'left' | 'right') => void;
  onAutoEstimate?: (side?: 'left' | 'right') => void;
  defaultExpanded?: boolean;
}

function TabLabel({ icon: Icon, text, count, active }: { icon: React.ElementType; text: string; count: number; active: boolean }) {
  return (
    <>
      <Icon className="w-3.5 h-3.5" />
      <span>{text}</span>
      <span className={`text-caption-2 px-1.5 rounded-full ${active ? 'bg-black/20 text-on-tint' : 'bg-fill text-label-2'}`}>
        {count}/6
      </span>
    </>
  );
}

export function PhaseMarkerBar({
  markers,
  leftMarkers,
  rightMarkers,
  activeTab = 'left',
  onTabChange,
  currentTime,
  isPhaseWarpEnabled,
  onTogglePhaseWarp,
  onTagPhase,
  onJumpToTimestamp,
  onAutoEstimate,
  defaultExpanded = false,
}: PhaseMarkerBarProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  const isDualMode = !!leftMarkers && !!rightMarkers;

  // Active markers based on mode & tab
  const currentMarkers = isDualMode
    ? activeTab === 'left'
      ? leftMarkers
      : rightMarkers
    : markers || [];

  const getMarkerForPhase = (phase: SwingPhase) => {
    return currentMarkers.find((m) => m.phase === phase);
  };

  const isAllTagged = currentMarkers.length >= SWING_PHASES.length;

  const leftCount = leftMarkers ? leftMarkers.length : 0;
  const rightCount = rightMarkers ? rightMarkers.length : 0;

  return (
    <div className="bg-surface border-t border-separator p-2 sm:p-2.5">
      {/* Header Bar & Tab Controls */}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        {isDualMode ? (
          /* Dual Tab Buttons */
          <SegmentedControl
            value={activeTab}
            onChange={(side) => onTabChange?.(side)}
            itemClassName="flex items-center justify-center gap-1 px-2.5 py-0.5 sm:py-1 text-xs"
            options={[
              { value: 'left' as const, label: <TabLabel icon={VideoIcon} text="左側" count={leftCount} active={activeTab === 'left'} /> },
              { value: 'right' as const, label: <TabLabel icon={Trophy} text="右側" count={rightCount} active={activeTab === 'right'} /> },
            ]}
          />
        ) : (
          <span className="text-xs font-semibold text-label-2 flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5 text-tint" />
            揮桿 6 階段標記
          </span>
        )}

        {/* Right side Actions & Expand Toggle */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          {/* Dynamic Phase Warping Sync Toggle */}
          {isDualMode && onTogglePhaseWarp && (
            <button
              onClick={onTogglePhaseWarp}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-caption font-semibold ${
                isPhaseWarpEnabled
                  ? 'bg-tint-fill text-on-tint border-transparent'
                  : 'bg-fill border-transparent text-label-2 hover:text-label'
              }`}
              title="分段變速同步：依兩支影片已標記的階段調整右側播放速度，讓各階段盡量同時抵達"
            >
              <Zap className={`w-3.5 h-3.5 ${isPhaseWarpEnabled ? 'fill-current text-on-tint' : 'text-tint'}`} />
              <span className="hidden xs:inline">{isPhaseWarpEnabled ? '⚡ 動態調速中' : '階段調速對齊'}</span>
            </button>
          )}

          {/* Fixed-ratio estimate button (when expanded) */}
          {isExpanded && onAutoEstimate && (
            <button
              onClick={() => onAutoEstimate(isDualMode ? activeTab : undefined)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-tint-soft text-tint hover:bg-tint-soft-strong text-caption font-semibold"
              title="依影片長度的固定比例填入 6 個階段，不會分析影片內容，請再手動校正"
            >
              <Clock className="w-3 h-3 text-tint" />
              <span>{isAllTagged ? '重新估算' : '依比例估算'}</span>
            </button>
          )}

          {/* Expand / Collapse Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-fill text-label-2 hover:text-label text-xs font-semibold"
          >
            <span>{isExpanded ? '收起標記' : '展開標記'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-tint" /> : <ChevronDown className="w-4 h-4 text-tint" />}
          </button>
        </div>
      </div>

      {/* Collapsed Mode Quick Pills (Horizontal scrollable mini-pills for fast jump when collapsed) */}
      <AnimatePresence initial={false}>
      {!isExpanded && (
        <motion.div
          key="pills"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={spring.ui}
          className="overflow-hidden"
        >
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1.5 pb-0.5 scrollbar-none">
          {SWING_PHASES.map((p) => {
            const existingMarker = getMarkerForPhase(p.key);
            const isTagged = !!existingMarker;

            return (
              <button
                key={p.key}
                onClick={() => {
                  if (existingMarker) {
                    onJumpToTimestamp(existingMarker.timestamp, isDualMode ? activeTab : undefined);
                  } else {
                    onTagPhase(p.key, currentTime, isDualMode ? activeTab : undefined);
                  }
                }}
                style={{
                  borderColor: isTagged ? p.color : undefined,
                }}
                className={`px-2 py-0.5 rounded-lg border text-caption-2 font-semibold whitespace-nowrap flex items-center gap-1 ${
                  isTagged
                    ? 'bg-fill text-label'
                    : 'bg-fill border-transparent text-label-3 hover:text-label-2'
                }`}
                title={isTagged ? `跳轉至 ${existingMarker.timestamp.toFixed(2)}s` : '將當前影格標記為此階段'}
              >
                <span style={{ color: isTagged ? p.color : undefined }}>{p.shortLabel}</span>
                {isTagged ? (
                  <span className="tabular-nums text-caption-2 text-label-2">{existingMarker.timestamp.toFixed(2)}s</span>
                ) : (
                  <span className="text-caption-2 text-label-3">+</span>
                )}
              </button>
            );
          })}
        </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Expanded Mode: Full 6 Phase Markers Grid */}
      <AnimatePresence initial={false}>
      {isExpanded && (
        <motion.div
          key="grid"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={spring.ui}
          className="overflow-hidden"
        >
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 mt-2 pt-2 border-t border-separator">
          {SWING_PHASES.map((p) => {
            const existingMarker = getMarkerForPhase(p.key);
            const isTagged = !!existingMarker;

            return (
              <div
                key={p.key}
                style={{
                  borderColor: isTagged ? p.color : undefined,
                }}
                className={`group relative flex flex-col items-center justify-between p-1.5 rounded-xl border text-center ${
                  isTagged
                    ? 'bg-fill text-label font-semibold'
                    : 'bg-fill border-transparent text-label-2 hover:text-label'
                }`}
              >
                {/* Main Action: Jump if tagged, or Tag if untagged */}
                <button
                  onClick={() => {
                    if (existingMarker) {
                      onJumpToTimestamp(existingMarker.timestamp, isDualMode ? activeTab : undefined);
                    } else {
                      onTagPhase(p.key, currentTime, isDualMode ? activeTab : undefined);
                    }
                  }}
                  className="w-full flex flex-col items-center justify-center"
                  title={isTagged ? `點擊跳轉至 ${existingMarker.timestamp.toFixed(2)}s` : '點擊將目前影格設為標記'}
                >
                  <span className="text-caption font-semibold truncate w-full" style={{ color: isTagged ? p.color : undefined }}>
                    {p.shortLabel}
                  </span>
                  <span className="text-caption-2 text-label-2 flex items-center gap-0.5 mt-0.5 tabular-nums">
                    {isTagged ? (
                      <>
                        <Clock className="w-2.5 h-2.5 text-label-2" />
                        {existingMarker.timestamp.toFixed(2)}s
                      </>
                    ) : (
                      '+ 設為標記'
                    )}
                  </span>
                </button>

                {/* Manual Correction Button when tagged */}
                {isTagged && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTagPhase(p.key, currentTime, isDualMode ? activeTab : undefined);
                    }}
                    className="mt-1 px-1.5 py-0.5 rounded bg-fill text-caption-2 text-label-2 hover:text-tint flex items-center gap-0.5"
                    title={`校正為當前秒數 (${currentTime.toFixed(2)}s)`}
                  >
                    <RefreshCw className="w-2.5 h-2.5 text-tint" />
                    <span>修正此格</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}



