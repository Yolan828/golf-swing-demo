'use client';

import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/common/Header';
import { BlobImage } from '@/components/common/BlobImage';
import { VideoUploader } from '@/components/video/VideoUploader';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { deleteUserVideo } from '@/db/services/videoService';
import { SwingVideo } from '@/types/video';
import { Video, Trash2, Columns, Bookmark, Calendar, Film } from 'lucide-react';

export default function MySwingsPage() {
  const userVideos = useLiveQuery(() => db.userVideos.orderBy('createdAt').reverse().toArray(), []);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`確定要刪除「${name}」這支影片嗎？`)) {
      await deleteUserVideo(id);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-4 p-4">
      <Header title="我的揮桿影片" showBack insideGutter />

      {/* Video Uploader Form */}
      <VideoUploader currentVideoCount={userVideos ? userVideos.length : 0} />

      {/* Video List */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-label-2">
          已保存影片 ({userVideos ? userVideos.length : 0} / 3)
        </h3>

        {userVideos && userVideos.length > 0 ? (
          <div className="flex flex-col gap-3">
            {userVideos.map((video: SwingVideo) => (
              <UserVideoListItem
                key={video.id}
                video={video}
                onDelete={() => handleDelete(video.id, video.filename)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-surface rounded-2xl p-8 text-center text-label-2 flex flex-col items-center gap-2">
            <Film className="w-10 h-10 text-label-3 mb-1" />
            <p className="text-sm font-semibold text-label-2">尚未上傳任何揮桿影片</p>
            <p className="text-xs text-label-2 max-w-xs">
              使用上方按鈕上傳相簿中的揮桿影片，或使用鏡頭實時拍攝。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function UserVideoListItem({
  video,
  onDelete,
}: {
  video: SwingVideo;
  onDelete: () => void;
}) {
  const formattedDate = new Date(video.createdAt).toLocaleDateString('zh-TW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-surface rounded-2xl p-3 flex gap-3">
      {/* Thumbnail */}
      <div className="w-24 aspect-video bg-black rounded-xl overflow-hidden shrink-0 relative flex items-center justify-center border border-separator">
        {video.thumbnailBlob ? (
          <BlobImage blob={video.thumbnailBlob} alt={video.filename} className="w-full h-full object-cover" />
        ) : (
          <Video className="w-6 h-6 text-label-3" />
        )}
        <span className="absolute bottom-1 right-1 text-caption-2 tabular-nums font-semibold bg-black/80 text-white px-1 py-0.5 rounded">
          {video.duration.toFixed(1)}s
        </span>
      </div>

      {/* Info & Actions */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-center justify-between gap-1 mb-1">
            <h4 className="text-xs font-semibold text-label truncate" title={video.filename}>
              {video.filename}
            </h4>
            <button
              onClick={onDelete}
              className="p-1 rounded-lg text-label-3 hover:text-danger hover:bg-fill-strong"
              title="刪除影片"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-caption-2 font-semibold px-2 py-0.5 rounded-full bg-tint-soft text-tint">
              {video.clubType}
            </span>
            <span className="text-caption-2 font-semibold px-2 py-0.5 rounded-full bg-fill text-label-2">
              {video.cameraAngle}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-separator mt-2">
          <span className="text-caption-2 text-label-2 tabular-nums flex items-center gap-1">
            <Calendar className="w-3 h-3 text-label-3" />
            {formattedDate}
          </span>

          <div className="flex items-center gap-2">
            <Link
              href={`/analysis?id=${encodeURIComponent(video.id)}`}
              className="whitespace-nowrap shrink-0 px-2.5 py-1 bg-fill hover:bg-fill-strong text-label text-xs font-semibold rounded-lg flex items-center gap-1"
            >
              <Bookmark className="w-3 h-3 text-warning" /> 標記
            </Link>

            <Link
              href={`/compare?userVideoId=${video.id}`}
              className="whitespace-nowrap shrink-0 px-2.5 py-1 bg-tint-fill hover:bg-tint-fill-hover text-on-tint text-xs font-semibold rounded-lg flex items-center gap-1"
            >
              <Columns className="w-3 h-3" /> 比對
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
