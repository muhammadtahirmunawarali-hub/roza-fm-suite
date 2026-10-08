'use client';

// Roza FM Suite — Image Lightbox
// Full-size image viewer with keyboard navigation, download, and thumbnail strip.
import { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { X, ChevronLeft, ChevronRight, Download, ExternalLink } from 'lucide-react';

export function ImageLightbox({
  images,
  index,
  open,
  onClose,
  onIndexChange,
}: {
  images: string[];
  index: number;
  open: boolean;
  onClose: () => void;
  onIndexChange?: (i: number) => void;
}) {
  const canPrev = index > 0;
  const canNext = index < images.length - 1;

  const goPrev = useCallback(() => {
    if (canPrev && onIndexChange) onIndexChange(index - 1);
  }, [canPrev, onIndexChange, index]);

  const goNext = useCallback(() => {
    if (canNext && onIndexChange) onIndexChange(index + 1);
  }, [canNext, onIndexChange, index]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && canPrev) goPrev();
      else if (e.key === 'ArrowRight' && canNext) goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, canPrev, canNext, goPrev, goNext, onClose]);

  if (!open || images.length === 0) return null;
  const current = images[index];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-4xl p-0 overflow-hidden bg-black/95 border-0"
        style={{ pointerEvents: 'auto' }}
        onEscapeKeyDown={onClose}
        onInteractOutside={onClose}
      >
        <DialogTitle className="sr-only">Image preview</DialogTitle>
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2.5 bg-gradient-to-b from-black/80 to-transparent">
          <div className="text-[11px] text-white/80">Image {index + 1} of {images.length}</div>
          <div className="flex items-center gap-1">
            <a href={current} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Open in new tab"><ExternalLink className="w-4 h-4" /></a>
            <a href={current} download className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Download"><Download className="w-4 h-4" /></a>
            <button onClick={onClose} className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Close (Esc)"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[60vh] max-h-[85vh] relative">
          {canPrev && (
            <button onClick={goPrev} className="absolute left-2 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors" title="Previous (←)"><ChevronLeft className="w-6 h-6" /></button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current} alt={`Image ${index + 1}`} className="max-w-full max-h-[85vh] object-contain" onClick={(e) => e.stopPropagation()} />
          {canNext && (
            <button onClick={goNext} className="absolute right-2 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors" title="Next (→)"><ChevronRight className="w-6 h-6" /></button>
          )}
        </div>
        {images.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 px-4 py-3 bg-gradient-to-t from-black/80 to-transparent">
            {images.map((url, i) => (
              <button
                key={i}
                onClick={() => onIndexChange?.(i)}
                className={`shrink-0 rounded overflow-hidden border-2 transition-all ${i === index ? 'border-[var(--erp-accent)] scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Thumbnail ${i + 1}`} className="w-12 h-12 object-cover" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
