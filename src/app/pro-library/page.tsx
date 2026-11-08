'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'motion/react';
import { Header } from '@/components/common/Header';
import { BottomSheet } from '@/components/common/BottomSheet';
import { BlobImage } from '@/components/common/BlobImage';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { saveBenchmarkVideo, deleteBenchmarkVideo, loadVideoBlob, getVideoSizeError, MAX_BENCHMARK_VIDEOS } from '@/db/services/videoService';
import { SwingVideo, ClubType, CameraAngle } from '@/types/video';
import { Columns, Play, Filter, Trophy, Upload, Trash2, Plus, X, Video, AlertCircle } from 'lucide-react';

export default function ProLibraryPage() {
  const benchmarkVideos = useLiveQuery(() => db.benchmarkVideos.orderBy('createdAt').reverse().toArray(), []);
  const [filterClub, setFilterClub] = useState<string>('ALL');

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadClub, setUploadClub] = useState<ClubType>('Driver');
  const [uploadAngle, setUploadAngle] = useState<CameraAngle>('DownTheLine');
  const [uploadError, setUploadError] = useState<string>('');
  const [bannerError, setBannerError] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLimitReached = (benchmarkVideos ? benchmarkVideos.length : 0) >= MAX_BENCHMARK_VIDEOS;

  const handleUploadClick = () => {
    if (isLimitReached) {
      setBannerError(`基準庫已達到影片保存上限 (${MAX_BENCHMARK_VIDEOS} 支)。若要上傳更多，請先將原本的影片刪除。`);
      return;
    }
    setBannerError('');
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // Lets the same file be picked again after cancelling.
    if (file) {
      if (isLimitReached) {
        setBannerError(`基準庫已達到影片保存上限 (${MAX_BENCHMARK_VIDEOS} 支)。若要上傳更多，請先將原本的影片刪除。`);
        return;
      }
      const sizeError = getVideoSizeError(file.size);
      if (sizeError) {
        setBannerError(sizeError);
        return;
      }
      setBannerError('');
      setUploadFile(file);
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
      setUploadError('');
      setShowUploadModal(true);
    }
  };

  const handleConfirmUpload = async () => {
    if (!uploadFile) return;
    setIsUploading(true);
    setUploadError('');
    try {
      await saveBenchmarkVideo(
        uploadFile,
        uploadTitle || uploadFile.name,
        uploadClub,
        uploadAngle
      );
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle('');
    } catch (err) {
      setUploadError(err instanceof Error && err.message ? err.message : '上傳失敗，請重試');
    } finally {
      setIsUploading(false);
    }
  };

  const filteredSwings = (benchmarkVideos || []).filter((swing) => {
    if (filterClub !== 'ALL' && swing.clubType !== filterClub) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col gap-4 p-4">
      <Header title="基準動作影片庫" showBack insideGutter />

      {/* Banner Error Notice */}
      {bannerError && (
        <div className="p-3 bg-danger-soft rounded-xl text-xs text-danger flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-danger shrink-0" />
            <span>{bannerError}</span>
          </div>
          <button onClick={() => setBannerError('')} aria-label="關閉提示" className="p-1 text-danger hover:text-label">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header CTA Bar */}
      <div className="flex items-center justify-between bg-surface p-3.5 rounded-2xl">
        <div>
          <h3 className="text-sm font-semibold text-label flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-warning" /> 自訂基準影片庫
            <span className="text-xs tabular-nums font-semibold text-tint bg-tint-soft px-2 py-0.5 rounded-full">
              {benchmarkVideos ? benchmarkVideos.length : 0} / {MAX_BENCHMARK_VIDEOS} 支
            </span>
          </h3>
          <p className="text-caption text-label-2 mt-0.5">
            上限 {MAX_BENCHMARK_VIDEOS} 支影片。上傳職業選手或理想動作作為雙片比對標竿
          </p>
        </div>

        <button
          onClick={handleUploadClick}
          disabled={isLimitReached}
          className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 shrink-0 ${
            isLimitReached
              ? 'bg-fill text-label-3 cursor-not-allowed border border-separator'
              : 'bg-tint-fill hover:bg-tint-fill-hover text-on-tint'
          }`}
        >
          <Plus className="w-4 h-4" /> 上傳基準影片
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-semibold text-label-2 flex items-center gap-1 shrink-0">
          <Filter className="w-3.5 h-3.5 text-tint" /> 球桿：
        </span>
        {['ALL', 'Driver', 'Iron', 'Wood', 'Wedge'].map((club) => (
          <button
            key={club}
            onClick={() => setFilterClub(club)}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${
              filterClub === club
                ? 'bg-tint-fill text-on-tint'
                : 'bg-fill text-label-2 border border-separator hover:text-label'
            }`}
          >
            {club === 'ALL' ? '全部球桿' : club}
          </button>
        ))}
      </div>

      {/* Benchmark Video Grid / Empty State */}
      {filteredSwings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredSwings.map((swing) => (
            <BenchmarkSwingCard key={swing.id} swing={swing} />
          ))}
        </div>
      ) : (
        <div className="bg-surface rounded-3xl p-8 text-center flex flex-col items-center justify-center my-4">
          <div className="w-14 h-14 rounded-full bg-tint-soft flex items-center justify-center mb-3">
            <Video className="w-7 h-7 text-tint" />
          </div>
          <h4 className="text-sm font-semibold text-label mb-1">尚無基準揮桿影片</h4>
          <p className="text-xs text-label-2 max-w-xs mb-4">
            點擊下方按鈕上傳您喜愛的職業選手影片或個人理想揮桿，即可進行姿勢雙重對比！
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-tint-fill hover:bg-tint-fill-hover text-on-tint font-semibold text-xs rounded-xl flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" /> 選擇影片上傳
          </button>
        </div>
      )}

      {/* Upload Confirmation Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <BottomSheet
            key="upload"
            onClose={() => setShowUploadModal(false)}
            dismissible={!isUploading}
            title={
              <h3 className="text-base font-semibold text-label flex items-center gap-2">
                <Trophy className="w-5 h-5 text-warning" /> 新增基準影片設定
              </h3>
            }
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-semibold text-label-2 mb-1">影片名稱 / 選手姓名</label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="例如: 理想動作 1號木"
                    className="w-full bg-fill rounded-xl p-2.5 text-sm text-label focus:ring-1 focus:ring-tint outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-label-2 mb-1">球桿類型</label>
                    <select
                      value={uploadClub}
                      onChange={(e) => setUploadClub(e.target.value as ClubType)}
                      className="w-full bg-fill rounded-xl p-2.5 text-sm text-label focus:ring-1 focus:ring-tint"
                    >
                      <option value="Driver">Driver (開球木桿)</option>
                      <option value="Wood">Wood (球道木桿)</option>
                      <option value="Iron">Iron (鐵桿)</option>
                      <option value="Wedge">Wedge (切桿)</option>
                      <option value="Putter">Putter (推桿)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-label-2 mb-1">拍攝視角</label>
                    <select
                      value={uploadAngle}
                      onChange={(e) => setUploadAngle(e.target.value as CameraAngle)}
                      className="w-full bg-fill rounded-xl p-2.5 text-sm text-label focus:ring-1 focus:ring-tint"
                    >
                      <option value="DownTheLine">Down The Line (後方目標線)</option>
                      <option value="FaceOn">Face On (正前方)</option>
                      <option value="Behind">Behind (正後方)</option>
                      <option value="Other">Other (其他)</option>
                    </select>
                  </div>
                </div>

                {uploadError && <p className="text-xs text-warning">{uploadError}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-separator">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-fill text-label-2 hover:text-label"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmUpload}
                  disabled={isUploading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-tint-fill text-on-tint hover:bg-tint-fill-hover disabled:opacity-50"
                >
                  {isUploading ? '處理中...' : '儲存基準影片'}
                </button>
              </div>
              </div>
            </BottomSheet>
          )}
        </AnimatePresence>
    </div>
  );
}

function BenchmarkSwingCard({ swing }: { swing: SwingVideo }) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const { id, blob, mimeType } = swing;

  // Only load on play: fallback-stored videos read their full bytes into memory.
  useEffect(() => {
    if (!isPlaying) return;
    let url: string | null = null;
    let cancelled = false;
    loadVideoBlob({ id, blob, mimeType }).then((loaded) => {
      if (loaded && !cancelled) {
        url = URL.createObjectURL(loaded);
        setVideoUrl(url);
      }
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [isPlaying, id, blob, mimeType]);

  const handleDelete = async () => {
    if (confirm(`確定要刪除「${swing.filename}」這支基準影片嗎？`)) {
      await deleteBenchmarkVideo(swing.id);
    }
  };

  return (
    <div className="bg-surface rounded-2xl overflow-hidden flex flex-col">
      {/* Video / Thumbnail Container */}
      <div className="relative aspect-video bg-black flex items-center justify-center group">
        {isPlaying && videoUrl ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              src={videoUrl}
              controls
              autoPlay
              playsInline
              webkit-playsinline="true"
              preload="auto"
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => setIsPlaying(false)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white backdrop-blur-md z-20"
              title="關閉影片"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            {swing.thumbnailBlob ? (
              <BlobImage blob={swing.thumbnailBlob} alt={swing.filename} className="w-full h-full object-cover opacity-80" />
            ) : (
              <div className="w-full h-full bg-surface-2 flex items-center justify-center text-label-3">
                <Video className="w-10 h-10 opacity-40" />
              </div>
            )}
            <button
              onClick={() => setIsPlaying(true)}
              aria-label="播放影片"
              className="absolute w-12 h-12 rounded-full bg-white/90 text-black flex items-center justify-center backdrop-blur-md group-hover:scale-110"
            >
              <Play className="w-6 h-6 fill-current ml-0.5" />
            </button>
          </>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
          <span className="text-caption-2 font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-md flex items-center gap-1">
            <Trophy className="w-3 h-3 fill-current" /> 基準
          </span>
          <span className="text-caption-2 font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-md">
            {swing.clubType}
          </span>
        </div>
      </div>

      {/* Info & Actions */}
      <div className="p-3.5 flex items-center justify-between">
        <div className="overflow-hidden mr-2">
          <h4 className="text-sm font-semibold text-label truncate">{swing.filename}</h4>
          <span className="text-caption text-label-2">視角：{swing.cameraAngle}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleDelete}
            className="p-2 bg-fill hover:bg-danger-soft hover:text-danger text-label-2 rounded-xl"
            title="刪除影片"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <Link
            href={`/compare?proVideoId=${swing.id}`}
            className="px-3 py-1.5 bg-tint-fill hover:bg-tint-fill-hover text-on-tint text-xs font-semibold rounded-xl flex items-center gap-1"
          >
            <Columns className="w-4 h-4" /> 選為比對基準
          </Link>
        </div>
      </div>
    </div>
  );
}
