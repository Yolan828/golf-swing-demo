'use client';

import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/common/Header';
import { CapacityBar } from '@/components/common/CapacityBar';
import { BlobImage } from '@/components/common/BlobImage';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Columns, Video, Users, Play, Plus, ShieldCheck, Zap } from 'lucide-react';
import { SwingVideo } from '@/types/video';

export default function HomePage() {
  const userVideos = useLiveQuery(() => db.userVideos.orderBy('createdAt').reverse().toArray(), []);

  return (
    <div className="flex-1 flex flex-col gap-4 p-4">
      <Header title="高爾夫揮桿比對" insideGutter />

      {/* Hero Quick Compare Banner */}
      <div className="bg-surface rounded-3xl p-5 relative overflow-hidden">
        <div className="flex items-center gap-2 text-tint font-semibold text-xs mb-1">
          <Zap className="w-4 h-4" /> Local-First 揮桿影片比對
        </div>
        <h2 className="text-2xl font-bold text-label mb-2 leading-tight">
          發現你的揮桿差異 <br />與職業選手同框比對
        </h2>
        <p className="text-xs text-label-2 mb-4 leading-relaxed">
          不用傳雲端、無須登入帳號。所有影片完全保存在您的手機本機 IndexedDB 中。
        </p>

        <div className="flex items-center gap-3">
          <Link
            href="/compare"
            className="flex-1 py-3 px-4 bg-tint-fill text-on-tint font-semibold rounded-2xl flex items-center justify-center gap-2 text-xs"
          >
            <Columns className="w-4 h-4" /> 開始雙片同步比對
          </Link>
          <Link
            href="/my-swings"
            className="py-3 px-4 bg-fill text-label font-semibold rounded-2xl flex items-center justify-center gap-1.5 text-xs hover:bg-fill-strong"
          >
            <Plus className="w-4 h-4 text-tint" /> 上傳/拍攝
          </Link>
        </div>
      </div>

      {/* Capacity Indicator Card */}
      <CapacityBar />

      {/* My Recent Videos */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-label flex items-center gap-2">
            <Video className="w-4 h-4 text-tint" />
            近期揮桿影片 ({userVideos ? userVideos.length : 0})
          </h3>
          <Link href="/my-swings" className="text-xs font-semibold text-tint hover:underline">
            查看全部 &rarr;
          </Link>
        </div>

        {userVideos && userVideos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {userVideos.slice(0, 2).map((vid: SwingVideo) => (
              <VideoCard key={vid.id} video={vid} />
            ))}
          </div>
        ) : (
          <div className="bg-surface rounded-2xl p-6 text-center text-label-2 flex flex-col items-center gap-2">
            <Video className="w-8 h-8 text-label-3 mb-1" />
            <p className="text-sm font-semibold text-label">尚無揮桿影片</p>
            <Link
              href="/my-swings"
              className="mt-1 px-4 py-2 bg-tint-soft text-tint rounded-xl text-xs font-semibold"
            >
              新增我的第一個揮桿影片
            </Link>
          </div>
        )}
      </div>

      {/* Pro Library Shortcut */}
      <div className="bg-surface rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-tint-soft flex items-center justify-center">
            <Users className="w-5 h-5 text-tint" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-label">職業選手比較庫</h4>
            <p className="text-caption text-label-2">上傳想對照的基準揮桿影片</p>
          </div>
        </div>
        <Link
          href="/pro-library"
          className="whitespace-nowrap shrink-0 px-3 py-2 bg-fill hover:bg-fill-strong text-tint text-xs font-semibold rounded-xl"
        >
          瀏覽影片 &rarr;
        </Link>
      </div>

      {/* Privacy Guarantee Badge */}
      <div className="mt-auto py-3 px-4 bg-fill rounded-xl flex items-center justify-center gap-2 text-caption text-label-2 font-medium">
        <ShieldCheck className="w-4 h-4 text-success" />
        <span>Local-First 隱私保護：無帳號 / 無雲端 / 影片不離開裝置</span>
      </div>
    </div>
  );
}

function VideoCard({ video }: { video: SwingVideo }) {
  return (
    <div className="bg-surface rounded-2xl overflow-hidden flex flex-col">
      <div className="relative aspect-video bg-black flex items-center justify-center">
        {video.thumbnailBlob ? (
          <BlobImage blob={video.thumbnailBlob} alt={video.filename} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-2 text-label-3">
            <Video className="w-8 h-8" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
          <span className="text-caption-2 font-semibold px-1.5 py-0.5 rounded bg-black/60 text-white backdrop-blur-md">
            {video.clubType}
          </span>
        </div>
      </div>
      <div className="p-2.5 flex flex-col justify-between flex-1">
        <h4 className="text-xs font-semibold text-label truncate mb-1" title={video.filename}>
          {video.filename}
        </h4>
        <div className="flex items-center justify-between pt-1 border-t border-separator">
          <span className="text-caption-2 text-label-2 tabular-nums">
            {(video.size / (1024 * 1024)).toFixed(1)} MB
          </span>
          <Link
            href={`/compare?userVideoId=${video.id}`}
            className="text-caption font-semibold text-tint flex items-center gap-1 hover:underline"
          >
            比對 <Play className="w-3 h-3 fill-current" />
          </Link>
        </div>
      </div>
    </div>
  );
}
