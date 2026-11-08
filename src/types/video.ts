export type ClubType = 'Driver' | 'Wood' | 'Iron' | 'Wedge' | 'Putter';
export type CameraAngle = 'DownTheLine' | 'FaceOn' | 'Behind' | 'Other';

export interface SwingVideo {
  id: string;             // Unique ID (e.g. UUID or timestamp)
  filename: string;       // Original filename
  blob?: Blob;            // Video Blob (mp4 / mov). Absent when bytes live in videoBytes; read via loadVideoBlob()
  mimeType: string;       // e.g. "video/mp4"
  createdAt: number;      // Unix timestamp (ms)
  duration: number;       // Duration in seconds
  size: number;           // File size in bytes
  clubType: ClubType;     // Club type
  cameraAngle: CameraAngle; // Camera angle
  thumbnailBlob?: Blob;   // Thumbnail Blob image
  thumbnailBytes?: ArrayBuffer; // Stored form of the thumbnail when Blobs can't be persisted; becomes thumbnailBlob on read
}

/** Video bytes for records WebKit refused to store as a Blob. Kept apart so list queries stay light. */
export interface VideoBytes {
  id: string;             // Same id as the SwingVideo
  bytes: ArrayBuffer;
}

export interface ProSwing {
  id: string;
  playerName: string;
  clubType: ClubType;
  cameraAngle: CameraAngle;
  videoUrl: string;       // Static URL path e.g. /videos/pro-...
  fallbackVideoUrl?: string; // Fallback CDN URL (MP4 format for maximum browser compatibility)
  thumbnailUrl: string;   // Static thumbnail path
  keyPhases?: Partial<Record<string, number>>; // Pre-defined phase timestamps
}
