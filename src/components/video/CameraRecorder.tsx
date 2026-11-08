'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Square, RefreshCw, X } from 'lucide-react';
import { ClubType, CameraAngle } from '@/types/video';

const MAX_RECORDING_SECONDS = 30;

interface CameraRecorderProps {
  onCapture: (blob: Blob, clubType: ClubType, cameraAngle: CameraAngle, durationSeconds: number) => void;
  onClose: () => void;
}

export function CameraRecorder({ onCapture, onClose }: CameraRecorderProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // MediaRecorder also fires `stop` when its tracks end, so closing the camera mid-recording
  // would otherwise save a video the user just discarded. Only an explicit stop may save.
  const saveOnStopRef = useRef<boolean>(false);
  const recordingStartedAtRef = useRef<number>(0);

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [clubType, setClubType] = useState<ClubType>('Driver');
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>('DownTheLine');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize camera stream
  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        // Closed while the permission prompt was open: don't leave the camera running.
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Rejects when a camera flip interrupts playback; the next stream restarts it.
          videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Camera access error:', err);
        setErrorMsg('無法存取攝影機。請確定開啟權限，或選擇從相簿匯入影片。');
      }
    };

    startCamera();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facingMode]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state !== 'recording') return;
    saveOnStopRef.current = true;
    recorder.stop();
    setIsRecording(false);
  }, []);

  // Timer for the recording limit
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      const seconds = Math.round((Date.now() - recordingStartedAtRef.current) / 1000);
      setRecordingSeconds(seconds);
      if (seconds >= MAX_RECORDING_SECONDS) stopRecording();
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording, stopRecording]);

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    saveOnStopRef.current = false;
    try {
      const mimeType = MediaRecorder.isTypeSupported('video/mp4')
        ? 'video/mp4'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (!saveOnStopRef.current) return;
        const recordedBlob = new Blob(chunksRef.current, { type: mimeType });
        if (recordedBlob.size > 0) {
          const durationSeconds = (Date.now() - recordingStartedAtRef.current) / 1000;
          onCapture(recordedBlob, clubType, cameraAngle, durationSeconds);
        }
      };

      recorder.start(500);
      recordingStartedAtRef.current = Date.now();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
    } catch (e) {
      console.error('MediaRecorder start failed:', e);
      setErrorMsg('鏡頭錄影功能無法啟動，請改用從相簿選擇影片。');
    }
  };

  const flipCamera = () => {
    if (isRecording) return;
    setErrorMsg(null);
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className="theme-dark fixed inset-0 z-[60] bg-black flex flex-col justify-between">
      {/* Top Bar */}
      <div className="p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-danger motion-safe:animate-pulse" />
          <span className="text-white tabular-nums text-sm font-semibold">
            {isRecording ? `錄影中 00:${recordingSeconds < 10 ? '0' : ''}${recordingSeconds} / 30s` : '相機就緒 (最大 30s)'}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="關閉相機"
          className="p-2 rounded-full bg-white/15 text-white hover:bg-white/25"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Video Viewport */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {errorMsg ? (
          <div className="p-6 text-center text-warning max-w-sm">
            <p className="mb-4">{errorMsg}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-fill text-white rounded-xl"
            >
              返回
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Controls & Metadata */}
      <div className="p-4 bg-surface border-t border-separator flex flex-col gap-3">
        {!isRecording && (
          <div className="flex items-center justify-center gap-3">
            <select
              value={clubType}
              onChange={(e) => setClubType(e.target.value as ClubType)}
              className="bg-fill text-tint text-xs font-semibold rounded-lg px-3 py-1.5"
            >
              <option value="Driver">Driver (一號木)</option>
              <option value="Wood">Wood (球道木)</option>
              <option value="Iron">Iron (鐵桿)</option>
              <option value="Wedge">Wedge (挖起桿)</option>
              <option value="Putter">Putter (推桿)</option>
            </select>

            <select
              value={cameraAngle}
              onChange={(e) => setCameraAngle(e.target.value as CameraAngle)}
              className="bg-fill text-tint text-xs font-semibold rounded-lg px-3 py-1.5"
            >
              <option value="DownTheLine">Down The Line (後方視角)</option>
              <option value="FaceOn">Face On (正面視角)</option>
              <option value="Behind">Behind (背後視角)</option>
              <option value="Other">其他視角</option>
            </select>
          </div>
        )}

        <div className="flex items-center justify-around py-2">
          <button
            onClick={flipCamera}
            disabled={isRecording}
            aria-label="切換前後鏡頭"
            className={`p-3 rounded-full bg-fill text-label-2 ${isRecording ? 'opacity-30' : ''}`}
          >
            <RefreshCw className="w-6 h-6" />
          </button>

          {isRecording ? (
            <button
              onClick={stopRecording}
              aria-label="停止錄影"
              className="w-16 h-16 rounded-full bg-danger flex items-center justify-center"
            >
              <Square className="w-7 h-7 text-white fill-white" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={!!errorMsg}
              aria-label="開始錄影"
              className="w-16 h-16 rounded-full bg-white flex items-center justify-center"
            >
              <div className="w-12 h-12 rounded-full border-2 border-black flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-danger" />
              </div>
            </button>
          )}

          <div className="w-12" />
        </div>
      </div>
    </div>
  );
}
