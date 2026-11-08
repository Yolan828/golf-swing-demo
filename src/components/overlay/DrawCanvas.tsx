'use client';

import React, { useRef, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Point2D } from '@/types/pose';
import { spring } from '@/utils/springs';
import { Pencil, Trash2, Eye, EyeOff, X } from 'lucide-react';

export interface DrawCanvasProps {
  active?: boolean;
  showToolbar?: boolean;
  color?: string;
  onColorChange?: (color: string) => void;
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  clearTrigger?: number;
  defaultExpanded?: boolean;
}

interface LinePath {
  id: string;
  color: string;
  points: Point2D[];
}

export const COLOR_OPTIONS = [
  { name: '綠色', hex: '#30D158' },
  { name: '紅色', hex: '#FF453A' },
  { name: '黃色', hex: '#FFD60A' },
  { name: '藍色', hex: '#0A84FF' },
  { name: '紫色', hex: '#BF5AF2' },
  { name: '白色', hex: '#FFFFFF' },
];

export interface DrawToolbarProps {
  color: string;
  onColorChange: (color: string) => void;
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onClear: () => void;
}

// Both states grow out of the top-right corner, where the pencil button sits.
const toolbarTransition = {
  initial: { opacity: 0, scale: 0.7 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.7 },
  transition: spring.quick,
  style: { originX: 1, originY: 0 },
};

export function DrawToolbar({
  color,
  onColorChange,
  visible,
  onVisibleChange,
  isExpanded,
  onExpandedChange,
  onClear,
}: DrawToolbarProps) {
  return (
    <div className="absolute top-2 right-2 z-30 pointer-events-auto max-w-[calc(100vw-1rem)]">
      <AnimatePresence initial={false} mode="popLayout" anchorX="right">
      {!isExpanded ? (
        /* Collapsed State: Single Pencil Button */
        <motion.button
          key="pencil"
          {...toolbarTransition}
          onClick={() => onExpandedChange(true)}
          className="group relative flex items-center justify-center p-2.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 text-white hover:bg-black/70"
          title="展開劃線畫筆"
        >
          <Pencil className="w-4 h-4 text-tint group-hover:scale-110 transition-transform" />
          {/* Color Indicator Badge */}
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black"
            style={{ backgroundColor: color }}
          />
        </motion.button>
      ) : (
        /* Expanded State: Full Brush & Color Panel */
        <motion.div
          key="panel"
          {...toolbarTransition}
          className="flex items-center gap-1 sm:gap-1.5 p-1.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/15 shadow-2xl max-w-full overflow-x-auto"
        >
          {/* Active Pencil Status */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-fill text-caption font-semibold text-tint shrink-0">
            <Pencil className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">畫筆</span>
          </div>

          <div className="w-px h-5 bg-white/15 mx-0.5 shrink-0" />

          {/* Color Selector Palette */}
          <div className="flex items-center gap-1.5 px-0.5 shrink-0">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.hex}
                onClick={() => onColorChange(c.hex)}
                title={c.name}
                style={{ backgroundColor: c.hex }}
                className={`w-5 h-5 rounded-full border shrink-0 ${
                  color === c.hex
                    ? 'scale-125 border-white ring-2 ring-tint'
                    : 'border-transparent opacity-70 hover:opacity-100 hover:scale-110'
                }`}
              />
            ))}
          </div>

          <div className="w-px h-5 bg-white/15 mx-0.5 shrink-0" />

          {/* Visibility Toggle */}
          <button
            onClick={() => onVisibleChange(!visible)}
            className={`p-1.5 rounded-xl shrink-0 ${
              visible
                ? 'text-tint hover:bg-fill'
                : 'text-label-3 hover:bg-fill hover:text-label-2'
            }`}
            title={visible ? '隱藏劃線' : '顯示劃線'}
          >
            {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Clear Canvas */}
          <button
            onClick={onClear}
            className="p-1.5 rounded-xl text-label-2 hover:text-danger hover:bg-fill shrink-0"
            title="清除劃線"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-white/15 mx-0.5 shrink-0" />

          {/* Collapse Panel Button */}
          <button
            onClick={() => onExpandedChange(false)}
            className="p-1.5 rounded-xl text-label-2 hover:text-label hover:bg-fill shrink-0"
            title="收起畫筆選單"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

export function DrawCanvas({
  active = true,
  showToolbar = true,
  color: controlledColor,
  onColorChange,
  visible: controlledVisible,
  onVisibleChange,
  isExpanded: controlledExpanded,
  onExpandedChange,
  clearTrigger,
  defaultExpanded = false,
}: DrawCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  const [internalColor, setInternalColor] = useState<string>('#30D158');
  const [internalVisible, setInternalVisible] = useState<boolean>(true);
  const [internalExpanded, setInternalExpanded] = useState<boolean>(defaultExpanded);
  const [paths, setPaths] = useState<LinePath[]>([]);

  const color = controlledColor ?? internalColor;
  const visible = controlledVisible ?? internalVisible;
  const isExpanded = controlledExpanded ?? internalExpanded;

  const setColor = (c: string) => {
    if (onColorChange) onColorChange(c);
    setInternalColor(c);
  };

  const setVisible = (v: boolean) => {
    if (onVisibleChange) onVisibleChange(v);
    setInternalVisible(v);
  };

  const setIsExpanded = (e: boolean) => {
    if (onExpandedChange) onExpandedChange(e);
    setInternalExpanded(e);
  };

  // React to clearTrigger prop
  const [handledClearTrigger, setHandledClearTrigger] = useState(clearTrigger);
  if (clearTrigger !== handledClearTrigger) {
    setHandledClearTrigger(clearTrigger);
    setPaths([]);
  }

  // Keep the canvas sized to its parent and drawn with the current paths
  useEffect(() => {
    const redraw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!visible) return;

      paths.forEach((path) => {
        if (path.points.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = path.color;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const p0 = path.points[0];
        ctx.moveTo(p0.x * canvas.width, p0.y * canvas.height);

        for (let i = 1; i < path.points.length; i++) {
          const pt = path.points[i];
          ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
        }
        ctx.stroke();
      });
    };

    const handleResize = () => {
      const canvas = canvasRef.current;
      const rect = canvas?.parentElement?.getBoundingClientRect();
      if (canvas && rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
      redraw();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [paths, visible]);

  const getNormalizedPoint = (e: React.TouchEvent | React.MouseEvent): Point2D | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!active || !visible || !isExpanded) return;
    const pt = getNormalizedPoint(e);
    if (!pt) return;
    setIsDrawing(true);
    const newPath: LinePath = {
      id: Date.now().toString(),
      color,
      points: [pt],
    };
    setPaths((prev) => [...prev, newPath]);
  };

  const moveDraw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing || !active || !visible || !isExpanded) return;
    const pt = getNormalizedPoint(e);
    if (!pt) return;
    setPaths((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      const updatedLast = {
        ...last,
        points: [...last.points, pt],
      };
      return [...prev.slice(0, -1), updatedLast];
    });
  };

  const endDraw = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    setPaths([]);
  };

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between">
      {/* Canvas Viewport */}
      <canvas
        ref={canvasRef}
        onMouseDown={startDraw}
        onMouseMove={moveDraw}
        onMouseUp={endDraw}
        onTouchStart={startDraw}
        onTouchMove={moveDraw}
        onTouchEnd={endDraw}
        className={`w-full h-full touch-none ${
          isExpanded && active && visible ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'
        }`}
      />

      {/* Floating Canvas Toolbar */}
      {showToolbar && (
        <DrawToolbar
          color={color}
          onColorChange={setColor}
          visible={visible}
          onVisibleChange={setVisible}
          isExpanded={isExpanded}
          onExpandedChange={setIsExpanded}
          onClear={clearCanvas}
        />
      )}
    </div>
  );
}


