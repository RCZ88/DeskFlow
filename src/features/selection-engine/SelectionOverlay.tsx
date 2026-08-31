import { useRef, useEffect, useCallback } from 'react';
import { useSelectionEngine } from './SelectionContext';
import { detectElement } from './elementDetection';
import { simplifyPath, canvasPathFromPoints, boundingRect } from './geometry';
import { generateSelectionId } from './SelectionContext';
import type { Point, SelectionResult } from './types';
import { toPng } from 'html-to-image';

export function SelectionOverlay() {
  const {
    isActive, activeTool, isDrawing, currentPath, currentRect,
    hoveredElement, startDrawing, updateDrawing, endDrawing, cancelDrawing,
    addSelection, setHoveredElement, setHighlightRect, deactivate,
  } = useSelectionEngine();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const isPointerDownRef = useRef(false);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (hoveredElement && activeTool === 'element' && !isDrawing) {
      const r = hoveredElement.rect;
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(r.x, r.y, r.width, r.height);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(251, 191, 36, 0.08)';
      ctx.fillRect(r.x, r.y, r.width, r.height);
    }

    if (isDrawing && currentPath.length > 0) {
      if (activeTool === 'freehand') {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        canvasPathFromPoints(ctx, currentPath);
        ctx.stroke();
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.fill();
      } else if (currentRect) {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.fillRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
      }
    }
  }, [isDrawing, currentPath, currentRect, hoveredElement, activeTool]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(redraw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [redraw]);

  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDrawing) {
          cancelDrawing();
        } else {
          deactivate();
        }
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [isActive, isDrawing, cancelDrawing, deactivate]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isPointerDownRef.current = true;
    const point: Point = { x: e.clientX, y: e.clientY };

    if (activeTool === 'element') {
      const el = detectElement(e.clientX, e.clientY);
      if (el) {
        captureElementSelection(el);
      }
      return;
    }

    startDrawing(point);
  }, [activeTool, startDrawing]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const point: Point = { x: e.clientX, y: e.clientY };

    if (activeTool === 'element' && !isDrawing) {
      const el = detectElement(e.clientX, e.clientY);
      setHoveredElement(el);
      setHighlightRect(el?.rect ?? null);
      return;
    }

    if (isDrawing) {
      updateDrawing(point);
    }
  }, [activeTool, isDrawing, updateDrawing, setHoveredElement, setHighlightRect]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    if (activeTool === 'element') return;
    if (!isDrawing) return;

    endDrawing();

    if (activeTool === 'rectangle' && currentRect && currentRect.width > 5 && currentRect.height > 5) {
      captureRectSelection(currentRect);
    } else if (activeTool === 'freehand' && currentPath.length > 3) {
      const simplified = simplifyPath(currentPath, 2);
      captureFreehandSelection(simplified);
    }
  }, [activeTool, isDrawing, currentRect, currentPath, endDrawing]);

  const captureElementSelection = useCallback(async (elementInfo: { tagName: string; className: string; id: string; xpath: string; cssSelector: string; rect: DOMRect; textContent: string; attributes: Record<string, string>; componentStack?: string }) => {
    try {
      const el = document.elementFromPoint(
        elementInfo.rect.left + elementInfo.rect.width / 2,
        elementInfo.rect.top + elementInfo.rect.height / 2
      );
      if (!el) return;
      const dataUrl = await toPng(el as HTMLElement, {
        pixelRatio: 2,
        skipAutoScale: true,
        style: { transform: 'none' },
      });
      const result: SelectionResult = {
        id: generateSelectionId(),
        timestamp: Date.now(),
        path: {
          tool: 'element',
          points: [
            { x: elementInfo.rect.left, y: elementInfo.rect.top },
            { x: elementInfo.rect.right, y: elementInfo.rect.bottom },
          ],
          boundingRect: {
            x: elementInfo.rect.left,
            y: elementInfo.rect.top,
            width: elementInfo.rect.width,
            height: elementInfo.rect.height,
          },
        },
        element: elementInfo,
        imageDataUrl: dataUrl,
        mimeType: 'image/png',
        width: elementInfo.rect.width,
        height: elementInfo.rect.height,
      };
      addSelection(result);
    } catch (err) {
      console.error('[SelectionEngine] Element capture failed:', err);
    }
  }, [addSelection]);

  const captureRectSelection = useCallback(async (rect: { x: number; y: number; width: number; height: number }) => {
    try {
      const root = document.getElementById('root');
      if (!root) return;
      const fullDataUrl = await toPng(root, { pixelRatio: 1 });
      const img = new Image();
      img.src = fullDataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
      });
      const canvas = document.createElement('canvas');
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(
        img,
        rect.x, rect.y, rect.width, rect.height,
        0, 0, rect.width, rect.height
      );
      const cropped = canvas.toDataURL('image/png');
      const result: SelectionResult = {
        id: generateSelectionId(),
        timestamp: Date.now(),
        path: {
          tool: 'rectangle',
          points: [
            { x: rect.x, y: rect.y },
            { x: rect.x + rect.width, y: rect.y },
            { x: rect.x + rect.width, y: rect.y + rect.height },
            { x: rect.x, y: rect.y + rect.height },
          ],
          boundingRect: rect,
        },
        imageDataUrl: cropped,
        mimeType: 'image/png',
        width: rect.width,
        height: rect.height,
      };
      addSelection(result);
    } catch (err) {
      console.error('[SelectionEngine] Rectangle capture failed:', err);
    }
  }, [addSelection]);

  const captureFreehandSelection = useCallback(async (points: Point[]) => {
    try {
      const root = document.getElementById('root');
      if (!root) return;
      const fullDataUrl = await toPng(root, { pixelRatio: 1 });
      const img = new Image();
      img.src = fullDataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
      });
      const bbox = boundingRect(points);
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = img.width;
      sourceCanvas.height = img.height;
      const sourceCtx = sourceCanvas.getContext('2d');
      if (!sourceCtx) return;
      sourceCtx.drawImage(img, 0, 0);
      const outCanvas = document.createElement('canvas');
      outCanvas.width = Math.ceil(bbox.width);
      outCanvas.height = Math.ceil(bbox.height);
      const outCtx = outCanvas.getContext('2d');
      if (!outCtx) return;
      outCtx.beginPath();
      const offsetX = -bbox.x;
      const offsetY = -bbox.y;
      outCtx.moveTo(points[0].x + offsetX, points[0].y + offsetY);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const midX = (prev.x + curr.x) / 2 + offsetX;
        const midY = (prev.y + curr.y) / 2 + offsetY;
        outCtx.quadraticCurveTo(prev.x + offsetX, prev.y + offsetY, midX, midY);
      }
      const last = points[points.length - 1];
      outCtx.lineTo(last.x + offsetX, last.y + offsetY);
      outCtx.closePath();
      outCtx.clip();
      outCtx.drawImage(
        sourceCanvas,
        bbox.x, bbox.y, bbox.width, bbox.height,
        0, 0, bbox.width, bbox.height
      );
      const cropped = outCanvas.toDataURL('image/png');
      const result: SelectionResult = {
        id: generateSelectionId(),
        timestamp: Date.now(),
        path: {
          tool: 'freehand',
          points,
          boundingRect: { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height },
        },
        imageDataUrl: cropped,
        mimeType: 'image/png',
        width: bbox.width,
        height: bbox.height,
      };
      addSelection(result);
    } catch (err) {
      console.error('[SelectionEngine] Freehand capture failed:', err);
    }
  }, [addSelection]);

  if (!isActive) return null;

  return (
    <div
      ref={containerRef}
      data-selection-overlay="true"
      className="fixed inset-0 z-[200]"
      style={{
        cursor: activeTool === 'element' ? 'crosshair' : 'crosshair',
        pointerEvents: 'auto',
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          if (isPointerDownRef.current) {
            isPointerDownRef.current = false;
            if (isDrawing) endDrawing();
          }
        }}
        style={{ touchAction: 'none' }}
      />
    </div>
  );
}
