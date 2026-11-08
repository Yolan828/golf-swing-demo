import Dexie, { Table } from 'dexie';
import { SwingVideo, VideoBytes } from '@/types/video';
import { SwingMarker } from '@/types/marker';

function restoreThumbnail(video: SwingVideo): SwingVideo {
  if (!video.thumbnailBytes) return video;
  const { thumbnailBytes, ...rest } = video;
  return { ...rest, thumbnailBlob: new Blob([thumbnailBytes], { type: 'image/jpeg' }) };
}

export class GolfSwingDatabase extends Dexie {
  userVideos!: Table<SwingVideo, string>;
  benchmarkVideos!: Table<SwingVideo, string>;
  swingMarkers!: Table<SwingMarker, string>;
  videoBytes!: Table<VideoBytes, string>;

  constructor() {
    super('GolfSwingPWA_DB');
    this.version(1).stores({
      userVideos: 'id, createdAt, clubType, cameraAngle',
      swingMarkers: 'id, videoId, phase, [videoId+phase]'
    });
    this.version(2).stores({
      userVideos: 'id, createdAt, clubType, cameraAngle',
      benchmarkVideos: 'id, createdAt, clubType, cameraAngle',
      swingMarkers: 'id, videoId, phase, [videoId+phase]'
    });
    this.version(3).stores({
      userVideos: 'id, createdAt, clubType, cameraAngle',
      benchmarkVideos: 'id, createdAt, clubType, cameraAngle',
      swingMarkers: 'id, videoId, phase, [videoId+phase]',
      videoBytes: 'id'
    });

    this.userVideos.hook('reading', restoreThumbnail);
    this.benchmarkVideos.hook('reading', restoreThumbnail);
  }
}

export const db = new GolfSwingDatabase();
