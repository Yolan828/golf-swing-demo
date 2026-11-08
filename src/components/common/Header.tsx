'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Flag } from 'lucide-react';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  /** Set when the page wraps the header in p-4, so the bar still reaches the screen edges. */
  insideGutter?: boolean;
}

export function Header({ title = 'GOLF SWING COMPARE', showBack = false, rightAction, insideGutter = false }: HeaderProps) {
  return (
    <header className={`${insideGutter ? '-mx-4 -mt-4 ' : ''}sticky top-0 z-40 material border-b border-separator px-4 py-3 flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        {showBack && (
          <Link
            href="/"
            aria-label="回首頁"
            className="p-1.5 rounded-lg bg-tint-soft text-tint hover:bg-tint-soft-strong"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
        )}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-tint-fill flex items-center justify-center text-on-tint font-semibold">
            <Flag className="w-4 h-4 text-on-tint fill-current" />
          </div>
          <h1 className="text-base font-semibold text-label">
            {title}
          </h1>
        </div>
      </div>
      <div>{rightAction}</div>
    </header>
  );
}
