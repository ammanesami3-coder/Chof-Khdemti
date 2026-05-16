'use client';

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { X, RotateCcw, Type, Eraser, Pencil, Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/i18n/language-context';

/* ── Constants ──────────────────────────────────────────────────────────── */

const PALETTE = [
  '#FFFFFF', '#000000', '#EF4444', '#3B82F6',
  '#EAB308', '#22C55E', '#F97316', '#EC4899', '#8B5CF6',
];
const BRUSH_SIZES = [4, 10, 22];

/* ── Types ──────────────────────────────────────────────────────────────── */

type Tool = 'draw' | 'eraser' | 'text';
type Pt   = { x: number; y: number };

// A stroke command stored in native image coordinates (memory-efficient undo)
type DrawCmd = {
  tool:  'draw' | 'eraser';
  color: string;
  size:  number;   // native px
  path:  Pt[];     // native coords
};

type TextItem = {
  id:    string;
  text:  string;
  nx:    number;  // 0-1 fraction of display canvas width
  ny:    number;  // 0-1 fraction of display canvas height
  color: string;
};

type Props = {
  src:      string;   // blob URL of the original image
  onSave:   (blob: Blob) => void;
  onCancel: () => void;
};

/* ── Helpers ────────────────────────────────────────────────────────────── */

function paintCmd(ctx: CanvasRenderingContext2D, cmd: DrawCmd) {
  const { tool, color, size, path } = cmd;
  if (path.length === 0) return;

  const p0 = path[0] as Pt;
  const pN = path[path.length - 1] as Pt;

  ctx.save();
  if (tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.fillStyle   = 'rgba(0,0,0,1)';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = color;
    ctx.fillStyle   = color;
  }
  ctx.lineWidth = size;
  ctx.lineCap   = 'round';
  ctx.lineJoin  = 'round';

  if (path.length === 1) {
    ctx.beginPath();
    ctx.arc(p0.x, p0.y, size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < path.length - 1; i++) {
      const pi  = path[i]     as Pt;
      const pi1 = path[i + 1] as Pt;
      const mx  = (pi.x + pi1.x) / 2;
      const my  = (pi.y + pi1.y) / 2;
      ctx.quadraticCurveTo(pi.x, pi.y, mx, my);
    }
    ctx.lineTo(pN.x, pN.y);
    ctx.stroke();
  }
  ctx.restore();
}

/* ── Component ──────────────────────────────────────────────────────────── */

export function ImageEditor({ src, onSave, onCancel }: Props) {
  const { t, lang } = useLang();
  // Refs (stable across renders)
  const mainRef       = useRef<HTMLCanvasElement>(null);
  const wrapRef       = useRef<HTMLDivElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const stableRef     = useRef<HTMLCanvasElement | null>(null); // native-res offscreen
  const imgRef        = useRef<HTMLImageElement | null>(null);
  const commandsRef   = useRef<DrawCmd[]>([]);
  const currentPtRef  = useRef<Pt[]>([]);
  const isDrawingRef  = useRef(false);
  const rafRef        = useRef<number>(0);

  // State
  const [tool,          setTool]          = useState<Tool>('draw');
  const [color,         setColor]         = useState<string>(PALETTE[0] ?? '#FFFFFF');
  const [brushSize,     setBrushSize]     = useState<number>(BRUSH_SIZES[1] ?? 10);
  const [texts,         setTexts]         = useState<TextItem[]>([]);
  const [addingText,    setAddingText]    = useState(false);
  const [pendingPos,    setPendingPos]    = useState<{ nx: number; ny: number } | null>(null);
  const [pendingTxt,    setPendingTxt]    = useState('');
  const [canUndo,       setCanUndo]       = useState(false);
  const [wrapSize,      setWrapSize]      = useState({ w: 0, h: 0 });
  const [ready,         setReady]         = useState(false);
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null);
  const [selectedTextId,  setSelectedTextId]  = useState<string | null>(null);
  const dragOffset    = useRef<{ nx: number; ny: number }>({ nx: 0, ny: 0 });
  const dragMoved     = useRef(false);
  const dragStartPos  = useRef<{ x: number; y: number } | null>(null);

  /* ── Load image ─────────────────────────────────────────────────────── */

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      imgRef.current = img;
      const off       = document.createElement('canvas');
      off.width       = img.naturalWidth;
      off.height      = img.naturalHeight;
      stableRef.current = off;
      commandsRef.current = [];
      setTexts([]);
      setCanUndo(false);
      setReady(true);
    };
    img.src = src;
  }, [src]);

  /* ── Flush: composite base + stable + live path onto main canvas ─────── */

  const flush = useCallback(() => {
    const main   = mainRef.current;
    const stable = stableRef.current;
    const img    = imgRef.current;
    if (!main || !stable || !img) return;

    const ctx = main.getContext('2d')!;
    const W   = main.width;
    const H   = main.height;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0, W, H);
    ctx.drawImage(stable, 0, 0, W, H);

    // Live stroke preview
    const path = currentPtRef.current;
    if (path.length > 0) {
      ctx.save();
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.fillStyle   = 'rgba(0,0,0,1)';
      } else {
        ctx.strokeStyle = color;
        ctx.fillStyle   = color;
      }
      ctx.lineWidth = brushSize;
      ctx.lineCap   = 'round';
      ctx.lineJoin  = 'round';
      const fp = path[0] as Pt;
      const lp = path[path.length - 1] as Pt;
      if (path.length === 1) {
        ctx.beginPath();
        ctx.arc(fp.x, fp.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(fp.x, fp.y);
        for (let i = 1; i < path.length - 1; i++) {
          const pi  = path[i]     as Pt;
          const pi1 = path[i + 1] as Pt;
          const mx  = (pi.x + pi1.x) / 2;
          const my  = (pi.y + pi1.y) / 2;
          ctx.quadraticCurveTo(pi.x, pi.y, mx, my);
        }
        ctx.lineTo(lp.x, lp.y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }, [tool, color, brushSize]);

  /* ── Fit canvas to container ─────────────────────────────────────────── */

  const resize = useCallback(() => {
    const container = containerRef.current;
    const img       = imgRef.current;
    if (!container || !img) return;
    const { width: cW, height: cH } = container.getBoundingClientRect();
    const aspect = img.naturalWidth / img.naturalHeight;
    let w = cW, h = cW / aspect;
    if (h > cH) { h = cH; w = h * aspect; }
    w = Math.floor(w);
    h = Math.floor(h);
    setWrapSize({ w, h });
    const main = mainRef.current;
    if (main) {
      main.width  = w;
      main.height = h;
      flush();
    }
  }, [flush]);

  useLayoutEffect(() => {
    if (!ready) return;
    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [ready, resize]);

  /* ── Pointer helpers ─────────────────────────────────────────────────── */

  const getDisplayPt = useCallback((clientX: number, clientY: number): Pt => {
    const rect = mainRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (mainRef.current!.width  / rect.width),
      y: (clientY - rect.top)  * (mainRef.current!.height / rect.height),
    };
  }, []);

  const toNative = useCallback((pt: Pt): Pt => {
    const main = mainRef.current!;
    const img  = imgRef.current!;
    return {
      x: pt.x * (img.naturalWidth  / main.width),
      y: pt.y * (img.naturalHeight / main.height),
    };
  }, []);

  /* ── Pointer events ──────────────────────────────────────────────────── */

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setSelectedTextId(null);
    const main = mainRef.current;
    if (!main) return;

    if (tool === 'text') {
      const rect = main.getBoundingClientRect();
      setPendingPos({
        nx: (e.clientX - rect.left) / rect.width,
        ny: (e.clientY - rect.top)  / rect.height,
      });
      setPendingTxt('');
      setAddingText(true);
      return;
    }

    main.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    currentPtRef.current = [getDisplayPt(e.clientX, e.clientY)];
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(flush);
  }, [tool, getDisplayPt, flush]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    currentPtRef.current.push(getDisplayPt(e.clientX, e.clientY));
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(flush);
  }, [getDisplayPt, flush]);

  const onPointerUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    cancelAnimationFrame(rafRef.current);

    const displayPath = currentPtRef.current;
    const stable      = stableRef.current;
    const img         = imgRef.current;
    if (!stable || !img || displayPath.length === 0) return;

    // Convert display path to native coords
    const nativePath = displayPath.map(toNative);
    const scaleX     = img.naturalWidth  / (mainRef.current?.width  ?? 1);
    const nativeSize = brushSize * scaleX;

    const cmd: DrawCmd = {
      tool:  tool === 'eraser' ? 'eraser' : 'draw',
      color,
      size:  nativeSize,
      path:  nativePath,
    };

    // Commit to stable canvas
    paintCmd(stable.getContext('2d')!, cmd);
    commandsRef.current.push(cmd);
    setCanUndo(true);

    currentPtRef.current = [];
    flush();
  }, [tool, color, brushSize, toNative, flush]);

  /* ── Undo ────────────────────────────────────────────────────────────── */

  const handleUndo = useCallback(() => {
    const cmds   = commandsRef.current;
    const stable = stableRef.current;
    if (!stable || cmds.length === 0) return;
    cmds.pop();
    // Replay remaining commands
    const sCtx = stable.getContext('2d')!;
    sCtx.clearRect(0, 0, stable.width, stable.height);
    for (const cmd of cmds) paintCmd(sCtx, cmd);
    setCanUndo(cmds.length > 0);
    flush();
  }, [flush]);

  /* ── Text ────────────────────────────────────────────────────────────── */

  const confirmText = useCallback(() => {
    if (!pendingPos || !pendingTxt.trim()) {
      setAddingText(false);
      return;
    }
    setTexts(prev => [...prev, {
      id:    `t${Date.now()}`,
      text:  pendingTxt.trim(),
      nx:    pendingPos.nx,
      ny:    pendingPos.ny,
      color: color,
    } satisfies TextItem]);
    setAddingText(false);
    setPendingTxt('');
    setPendingPos(null);
  }, [pendingPos, pendingTxt, color]);

  /* ── Text drag ──────────────────────────────────────────────────────── */

  const onTextPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, t: TextItem) => {
    e.stopPropagation();
    e.preventDefault();
    const wrap = wrapRef.current;
    if (!wrap) return;
    dragMoved.current    = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    const rect = wrap.getBoundingClientRect();
    dragOffset.current = {
      nx: (e.clientX - rect.left) / rect.width  - t.nx,
      ny: (e.clientY - rect.top)  / rect.height - t.ny,
    };
    setDraggingTextId(t.id);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onTextPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingTextId) return;
    // Only update position once the finger/cursor moves meaningfully
    if (!dragMoved.current && dragStartPos.current) {
      const dx = Math.abs(e.clientX - dragStartPos.current.x);
      const dy = Math.abs(e.clientY - dragStartPos.current.y);
      if (dx < 5 && dy < 5) return;
      dragMoved.current = true;
    }
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const nx = Math.max(0.02, Math.min(0.98, (e.clientX - rect.left) / rect.width  - dragOffset.current.nx));
    const ny = Math.max(0.02, Math.min(0.98, (e.clientY - rect.top)  / rect.height - dragOffset.current.ny));
    setTexts(prev => prev.map(t => t.id === draggingTextId ? { ...t, nx, ny } : t));
  }, [draggingTextId]);

  const onTextPointerUp = useCallback((textId: string) => {
    if (!dragMoved.current) {
      // Tap (no drag) → toggle selection
      setSelectedTextId(prev => prev === textId ? null : textId);
    }
    setDraggingTextId(null);
    dragStartPos.current = null;
  }, []);

  /* ── Text select actions ────────────────────────────────────────────── */

  const handleDeleteText = useCallback((id: string) => {
    setTexts(prev => prev.filter(t => t.id !== id));
    setSelectedTextId(null);
  }, []);

  const handleEditText = useCallback((t: TextItem) => {
    setTexts(prev => prev.filter(item => item.id !== t.id));
    setSelectedTextId(null);
    setColor(t.color);
    setPendingPos({ nx: t.nx, ny: t.ny });
    setPendingTxt(t.text);
    setAddingText(true);
    setTool('text');
  }, []);

  /* ── Export ──────────────────────────────────────────────────────────── */

  const handleSave = useCallback(() => {
    const img    = imgRef.current;
    const stable = stableRef.current;
    if (!img || !stable) return;

    const W   = img.naturalWidth;
    const H   = img.naturalHeight;
    const exp = document.createElement('canvas');
    exp.width  = W;
    exp.height = H;
    const eCtx = exp.getContext('2d')!;
    eCtx.drawImage(img, 0, 0);
    eCtx.drawImage(stable, 0, 0);

    // Paint text overlays at native scale
    for (const t of texts) {
      const fontSize = Math.round(W * 0.055);
      eCtx.save();
      eCtx.font         = `bold ${fontSize}px system-ui, sans-serif`;
      eCtx.fillStyle    = t.color;
      eCtx.textAlign    = 'center';
      eCtx.textBaseline = 'middle';
      eCtx.shadowColor  = 'rgba(0,0,0,0.85)';
      eCtx.shadowBlur   = fontSize * 0.3;
      eCtx.fillText(t.text, t.nx * W, t.ny * H);
      eCtx.restore();
    }

    exp.toBlob((blob) => { if (blob) onSave(blob); }, 'image/jpeg', 0.88);
  }, [texts, onSave]);

  /* ── Render ──────────────────────────────────────────────────────────── */

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 pt-safe">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
          aria-label={t('cancelLabel')}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors disabled:opacity-30"
            aria-label={t('undoLabel')}
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          aria-label={t('saveLabel')}
        >
          <Check className="h-5 w-5" />
        </button>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="relative flex flex-1 items-center justify-center overflow-hidden p-2">
        {/* Wrapper: same pixel size as canvas — anchors text overlays */}
        <div
          ref={wrapRef}
          className="relative"
          style={{ width: wrapSize.w, height: wrapSize.h }}
        >
          <canvas
            ref={mainRef}
            width={wrapSize.w}
            height={wrapSize.h}
            className={cn(
              'absolute inset-0 block touch-none',
              tool === 'text'   && 'cursor-text',
              tool === 'draw'   && 'cursor-crosshair',
              tool === 'eraser' && 'cursor-cell',
            )}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />

          {/* Committed text overlays — draggable, tappable to select */}
          {texts.map((t) => (
            <div
              key={t.id}
              className={cn(
                'absolute font-bold leading-tight select-none',
                draggingTextId === t.id ? 'cursor-grabbing' : 'cursor-grab',
                selectedTextId === t.id && 'outline outline-2 outline-white/70 rounded-sm px-1',
              )}
              style={{
                left:        `${t.nx * 100}%`,
                top:         `${t.ny * 100}%`,
                transform:   'translate(-50%, -50%)',
                color:       t.color,
                fontSize:    `${Math.round(wrapSize.w * 0.055)}px`,
                textShadow:  '0 2px 12px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.6)',
                whiteSpace:  'nowrap',
                touchAction: 'none',
              }}
              onPointerDown={(e) => onTextPointerDown(e, t)}
              onPointerMove={onTextPointerMove}
              onPointerUp={() => onTextPointerUp(t.id)}
              onPointerCancel={() => onTextPointerUp(t.id)}
            >
              {t.text}
            </div>
          ))}

          {/* Floating action bar for the selected text */}
          {selectedTextId && (() => {
            const sel = texts.find(t => t.id === selectedTextId);
            if (!sel) return null;
            return (
              <div
                className="absolute z-10 flex gap-1.5"
                style={{
                  left:      `${sel.nx * 100}%`,
                  top:       `${sel.ny * 100}%`,
                  transform: 'translate(-50%, calc(-100% - 14px))',
                }}
              >
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => handleEditText(sel)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80 transition-colors"
                  aria-label={t('editTextAriaLabel')}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => handleDeleteText(sel.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/80 text-white backdrop-blur-sm hover:bg-red-600 transition-colors"
                  aria-label={t('deleteTextAriaLabel')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })()}

          {/* Text input while composing */}
          {addingText && pendingPos && (
            <input
              autoFocus
              type="text"
              value={pendingTxt}
              onChange={(e) => setPendingTxt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); confirmText(); }
                if (e.key === 'Escape') setAddingText(false);
              }}
              onBlur={confirmText}
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-52 bg-transparent border-none outline-none font-bold text-center caret-white"
              style={{
                left:       `${pendingPos.nx * 100}%`,
                top:        `${pendingPos.ny * 100}%`,
                color:      color,
                fontSize:   `${Math.round(wrapSize.w * 0.055)}px`,
                textShadow: '0 2px 12px rgba(0,0,0,0.9)',
              }}
            />
          )}
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="flex flex-col gap-4 px-5 pb-8 pt-4 pb-safe">
        {/* Color palette */}
        <div className="flex items-center justify-center gap-2.5">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                'rounded-full border-2 transition-all duration-150',
                color === c ? 'scale-[1.3] border-white shadow-lg shadow-black/40' : 'scale-100 border-transparent',
              )}
              style={{ width: 28, height: 28, backgroundColor: c }}
              aria-label={`${t('colorAriaLabel')} ${c}`}
            />
          ))}
        </div>

        {/* Tools + brush size row */}
        <div className="flex items-center justify-between">
          {/* Tool selector */}
          <div className="flex items-center gap-1.5">
            {([
              ['draw',   Pencil, t('toolDraw')],
              ['eraser', Eraser, t('toolEraser')],
              ['text',   Type,   t('toolText')],
            ] as const).map(([toolKey, Icon, label]) => (
              <button
                key={toolKey}
                type="button"
                onClick={() => setTool(toolKey)}
                aria-label={label}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                  tool === toolKey ? 'bg-white text-black' : 'text-white/70 hover:bg-white/10',
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          {/* Brush size dots */}
          <div className="flex items-center gap-3">
            {BRUSH_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setBrushSize(s)}
                aria-label={`${t('brushSizeAriaLabel')} ${s}`}
                className={cn(
                  'flex items-center justify-center rounded-full border-2 transition-all',
                  brushSize === s ? 'border-white' : 'border-white/30',
                )}
                style={{ width: s + 14, height: s + 14 }}
              >
                <div className="rounded-full bg-white" style={{ width: s, height: s }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
