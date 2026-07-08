import { useEffect, useRef, useState } from "react";
import { AgentChat } from "./AgentChat";
import { GripHorizontal } from "lucide-react";

const CARD_W = 400;
const CARD_H = 560;

export function AgentCard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    // Position bottom-right on first open.
    setPos((p) => {
      if (p.x !== 0 || p.y !== 0) return p;
      const x = Math.max(16, window.innerWidth - CARD_W - 24);
      const y = Math.max(16, window.innerHeight - CARD_H - 24);
      return { x, y };
    });
  }, [open]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const nx = e.clientX - dragRef.current.dx;
      const ny = e.clientY - dragRef.current.dy;
      const maxX = window.innerWidth - CARD_W;
      const maxY = window.innerHeight - CARD_H;
      setPos({
        x: Math.min(Math.max(0, nx), Math.max(0, maxX)),
        y: Math.min(Math.max(0, ny), Math.max(0, maxY)),
      });
    };
    const onUp = () => (dragRef.current = null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-white/70 bg-background shadow-2xl ring-1 ring-white/40"
      style={{ left: pos.x, top: pos.y, width: CARD_W, height: CARD_H }}
    >
      <div
        className="flex cursor-grab items-center justify-center gap-1.5 border-b border-border/40 bg-muted/40 py-1 text-[11px] font-medium text-muted-foreground active:cursor-grabbing"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
        }}
        title="Drag to move"
      >
        <GripHorizontal className="h-3.5 w-3.5" />
        <span>Drag Here</span>
      </div>

      <div className="flex-1 overflow-hidden">
        <AgentChat onClose={onClose} />
      </div>
    </div>
  );
}
