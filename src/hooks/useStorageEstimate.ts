import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { MAX_USER_VIDEOS } from '@/db/services/videoService';

export interface StorageInfo {
  videoCount: number;
  maxVideos: number;
  usedBytes: number;
  totalQuotaBytes: number;
  usedMB: string;
  totalQuotaMB: string;
  percentUsed: number;
  loading: boolean;
}

export function useStorageEstimate(): StorageInfo {
  const userVideos = useLiveQuery(() => db.userVideos.toArray(), []);
  const [storageData, setStorageData] = useState<{ usedBytes: number; totalQuotaBytes: number }>({
    usedBytes: 0,
    totalQuotaBytes: 0,
  });

  useEffect(() => {
    let isMounted = true;
    if (typeof window !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((estimate) => {
        if (isMounted) {
          setStorageData({
            usedBytes: estimate.usage || 0,
            totalQuotaBytes: estimate.quota || 0,
          });
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [userVideos]);

  const videoCount = userVideos ? userVideos.length : 0;
  const usedMB = (storageData.usedBytes / (1024 * 1024)).toFixed(1);
  const totalQuotaMB = (storageData.totalQuotaBytes / (1024 * 1024)).toFixed(0);
  const percentUsed = storageData.totalQuotaBytes > 0
    ? Math.min(100, (storageData.usedBytes / storageData.totalQuotaBytes) * 100)
    : 0;

  return {
    videoCount,
    maxVideos: MAX_USER_VIDEOS,
    usedBytes: storageData.usedBytes,
    totalQuotaBytes: storageData.totalQuotaBytes,
    usedMB,
    totalQuotaMB,
    percentUsed,
    loading: userVideos === undefined,
  };
}
