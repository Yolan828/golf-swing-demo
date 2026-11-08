'use client';

import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { animate, motion, useMotionValue, usePresence, useReducedMotion, useTransform } from 'motion/react';
import { X } from 'lucide-react';
import { projectMomentum, rubberband, spring } from '@/utils/springs';

interface BottomSheetProps {
  title: React.ReactNode;
  onClose: () => void;
  /** False while work is in progress: drag, backdrop and close button are all ignored. */
  dismissible?: boolean;
  children: React.ReactNode;
}

/** Render inside <AnimatePresence> so the sheet can slide out before unmounting. */
export function BottomSheet({ title, onClose, dismissible = true, children }: BottomSheetProps) {
  const [isPresent, safeToRemove] = usePresence();
  const prefersReducedMotion = useReducedMotion();

  const sheetRef = useRef<HTMLDivElement | null>(null);
  const heightRef = useRef<number>(1);
  const grabOffsetRef = useRef<number | null>(null);

  const y = useMotionValue(prefersReducedMotion ? 0 : 10000);
  const opacity = useMotionValue(prefersReducedMotion ? 0 : 1);
  const scrimOpacity = useTransform([y, opacity], ([currentY, currentOpacity]: number[]) => {
    const progress = 1 - Math.min(1, Math.max(0, currentY) / heightRef.current);
    return progress * currentOpacity;
  });

  useLayoutEffect(() => {
    heightRef.current = sheetRef.current?.offsetHeight ?? 1;
    if (!prefersReducedMotion) y.set(heightRef.current);
  }, [prefersReducedMotion, y]);

  useEffect(() => {
    const onComplete = isPresent ? undefined : safeToRemove ?? undefined;
    const controls = prefersReducedMotion
      ? animate(opacity, isPresent ? 1 : 0, { duration: 0.2, onComplete })
      : animate(y, isPresent ? 0 : heightRef.current, { ...spring.ui, onComplete });
    return () => controls.stop();
  }, [isPresent, safeToRemove, prefersReducedMotion, opacity, y]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dismissible) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    y.stop();
    grabOffsetRef.current = e.clientY - y.get();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (grabOffsetRef.current === null) return;
    const next = e.clientY - grabOffsetRef.current;
    y.set(next < 0 ? -rubberband(-next, heightRef.current) : next);
  };

  const handlePointerEnd = () => {
    if (grabOffsetRef.current === null) return;
    grabOffsetRef.current = null;

    const velocity = y.getVelocity();
    const height = heightRef.current;
    if (y.get() + projectMomentum(velocity) > height / 2) {
      animate(y, height, { ...spring.ui, velocity, onComplete: onClose });
    } else {
      animate(y, 0, { ...(velocity === 0 ? spring.ui : spring.momentum), velocity });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end" role="dialog" aria-modal="true">
      <motion.div
        className="absolute inset-0 bg-black/40"
        style={{ opacity: scrimOpacity }}
        onClick={dismissible ? onClose : undefined}
      />

      <motion.div
        ref={sheetRef}
        style={{ y, opacity }}
        className="relative w-full max-w-md mx-auto bg-surface rounded-t-3xl"
      >
        {/* Keeps the area below the sheet covered when it is pulled upward. */}
        <div className="absolute top-full inset-x-0 h-24 bg-surface" />
        <div className="absolute top-2 left-1/2 -translate-x-1/2 h-1 w-9 rounded-full bg-separator pointer-events-none" />

        <div className="flex items-center mx-5 border-b border-separator">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            className="flex-1 min-w-0 pt-6 pb-3 touch-none cursor-grab active:cursor-grabbing"
          >
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!dismissible}
            aria-label="關閉"
            className="p-1 mt-3 rounded-full text-label-2 hover:text-label disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[75dvh] overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
