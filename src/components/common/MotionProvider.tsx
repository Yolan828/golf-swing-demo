'use client';

import React, { useEffect } from 'react';
import { MotionConfig } from 'motion/react';

export function MotionProvider({ children }: { children: React.ReactNode }) {
  // iOS Safari only applies :active press styles once a touchstart listener exists.
  useEffect(() => {
    const noop = () => {};
    document.addEventListener('touchstart', noop, { passive: true });
    return () => document.removeEventListener('touchstart', noop);
  }, []);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
