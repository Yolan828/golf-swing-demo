'use client';

import React, { useState } from 'react';
import { Upload, Camera, AlertCircle, Plus } from 'lucide-react';
import { ClubType, CameraAngle } from '@/types/video';
import { saveUserVideo, getVideoSizeError, MAX_USER_VIDEOS } from '@/db/services/videoService';
import { CameraRecorder } from './CameraRecorder';

interface VideoUploaderProps {
  currentVideoCount: number;
  onVideoAdded?: () => void;
}

export function VideoUploader({ currentVideoCount, onVideoAdded }: VideoUploaderProps) {
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [clubType, setClubType] = useState<ClubType>('Driver');
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>('DownTheLine');

  const isLimitReached = currentVideoCount >= MAX_USER_VIDEOS;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    // Check size / limit
    if (isLimitReached) {
      setErrorMsg(`已達到影片保存上限 (${MAX_USER_VIDEOS} 支)。請先刪除舊影片。`);
      return;
    }

    const sizeError = getVideoSizeError(file.size);
    if (sizeError) {
      setErrorMsg(sizeError);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // Estimate duration from HTML5 Video
      const duration = await getVideoDuration(file);
      await saveUserVideo(file, file.name, clubType, cameraAngle, duration);
      if (onVideoAdded) onVideoAdded();
    } catch (err) {
      console.error('File upload error:', err);
      setErrorMsg(err instanceof Error && err.message ? err.message : '無法儲存影片，請確認影片格式與瀏覽器儲存空間。');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleCameraCapture = async (blob: Blob, club: ClubType, angle: CameraAngle, durationSeconds: number) => {
    setShowCamera(false);
    setLoading(true);
    setErrorMsg(null);
    try {
      const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const filename = `Golf_Swing_${new Date().toISOString().slice(0, 10)}_${Date.now().toString().slice(-4)}.${extension}`;
      await saveUserVideo(blob, filename, club, angle, durationSeconds);
      if (onVideoAdded) onVideoAdded();
    } catch (err) {
      console.error('Camera save error:', err);
      setErrorMsg(err instanceof Error && err.message ? err.message : '無法儲存鏡頭影片。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-surface rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-tint mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4" /> 新增揮桿影片
        </h3>

        {errorMsg && (
          <div className="mb-3 p-3 bg-danger-soft rounded-xl text-xs text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-danger shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Club & Angle Selector */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-caption font-semibold text-label-2 mb-1">球桿種類</label>
            <select
              value={clubType}
              onChange={(e) => setClubType(e.target.value as ClubType)}
              className="w-full bg-fill text-label text-xs rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-tint"
            >
              <option value="Driver">Driver (一號木)</option>
              <option value="Wood">Wood (球道木)</option>
              <option value="Iron">Iron (鐵桿)</option>
              <option value="Wedge">Wedge (挖起桿)</option>
              <option value="Putter">Putter (推桿)</option>
            </select>
          </div>

          <div>
            <label className="block text-caption font-semibold text-label-2 mb-1">拍攝角度</label>
            <select
              value={cameraAngle}
              onChange={(e) => setCameraAngle(e.target.value as CameraAngle)}
              className="w-full bg-fill text-label text-xs rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-tint"
            >
              <option value="DownTheLine">Down The Line (後方視角)</option>
              <option value="FaceOn">Face On (正面視角)</option>
              <option value="Behind">Behind (背後視角)</option>
              <option value="Other">其他視角</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <label
            className={`flex flex-col items-center justify-center p-3 rounded-xl border border-dashed cursor-pointer ${
              isLimitReached
                ? 'border-separator bg-fill opacity-40 cursor-not-allowed'
                : 'border-tint-line bg-tint-soft hover:bg-tint-soft-strong text-tint'
            }`}
          >
            <Upload className="w-6 h-6 mb-1 text-tint" />
            <span className="text-xs font-semibold">從相簿匯入</span>
            <span className="text-caption-2 text-label-2">MP4 / MOV (&lt;150MB)</span>
            <input
              type="file"
              accept="video/*,video/mp4,video/quicktime,video/mov,video/webm,video/3gpp"
              disabled={isLimitReached || loading}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            type="button"
            disabled={isLimitReached || loading}
            onClick={() => setShowCamera(true)}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border border-dashed ${
              isLimitReached
                ? 'border-separator bg-fill opacity-40 cursor-not-allowed'
                : 'border-tint-line bg-tint-soft hover:bg-tint-soft-strong text-tint'
            }`}
          >
            <Camera className="w-6 h-6 mb-1 text-tint" />
            <span className="text-xs font-semibold">鏡頭實時拍攝</span>
            <span className="text-caption-2 text-label-2">Camera API</span>
          </button>
        </div>
      </div>

      {showCamera && (
        <CameraRecorder
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </>
  );
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        URL.revokeObjectURL(url);
      }
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve(5.0);
    }, 2500);

    video.src = url;
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      clearTimeout(timer);
      const dur = video.duration;
      cleanup();
      // MediaRecorder WebM files report Infinity until fully read.
      resolve(dur && Number.isFinite(dur) ? dur : 5.0);
    };

    video.onerror = () => {
      clearTimeout(timer);
      cleanup();
      resolve(5.0);
    };
  });
}
