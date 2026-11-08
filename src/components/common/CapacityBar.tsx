'use client';

import React from 'react';
import { useStorageEstimate } from '@/hooks/useStorageEstimate';
import { HardDrive, AlertCircle } from 'lucide-react';

export function CapacityBar() {
  const { videoCount, maxVideos, usedMB, totalQuotaMB, loading } = useStorageEstimate();

  if (loading) return null;

  const isFull = videoCount >= maxVideos;

  return (
    <div className="bg-surface rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-label-2 font-semibold text-sm">
          <HardDrive className="w-4 h-4 text-tint" />
          <span>本機儲存容量狀態</span>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          isFull ? 'bg-warning-soft text-warning' : 'bg-tint-soft text-tint'
        }`}>
          {videoCount} / {maxVideos} 支影片
        </span>
      </div>

      {/* Progress Bar for video count */}
      <div className="w-full bg-fill h-2.5 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full transition-all duration-300 ${
            isFull ? 'bg-warning' : 'bg-tint-fill'
          }`}
          style={{ width: `${(videoCount / maxVideos) * 100}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-label-2">
        <span>已佔用容量：{usedMB} MB</span>
        <span>總可用配額：{totalQuotaMB !== '0' ? `${totalQuotaMB} MB` : '無限制'}</span>
      </div>

      {isFull && (
        <div className="mt-3 flex items-start gap-2 bg-warning-soft rounded-xl p-2.5 text-xs text-warning">
          <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <span>已達 {maxVideos} 支影片保存上限。若需新增影片，請先刪除舊揮桿紀錄。</span>
        </div>
      )}
    </div>
  );
}
