'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Video, Trophy, Columns } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: '首頁', icon: Home },
    { href: '/my-swings', label: '我的揮桿', icon: Video },
    { href: '/pro-library', label: '基準庫', icon: Trophy },
    { href: '/compare', label: '雙片比對', icon: Columns },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 material border-t border-separator px-2 py-2 flex items-center justify-around">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl ${
              isActive
                ? 'text-tint font-semibold'
                : 'text-label-2 hover:text-label'
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className="text-caption font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
