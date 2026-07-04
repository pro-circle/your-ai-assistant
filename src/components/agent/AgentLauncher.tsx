import { useEffect, useState } from "react";
import { MessageCircle, PanelRight, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentCard } from "./AgentCard";
import { AgentSidebar } from "./AgentSidebar";
import { cn } from "@/lib/utils";

type Surface = "sidebar" | "card";
const KEY = "agent-surface";

export function AgentLauncher() {
  const [surface, setSurface] = useState<Surface>("sidebar");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const s = (typeof window !== "undefined" && localStorage.getItem(KEY)) as Surface | null;
    if (s === "sidebar" || s === "card") setSurface(s);
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, surface);
  }, [surface]);

  // Listen for global open events triggered from CTAs.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Surface | undefined>).detail;
      if (detail === "sidebar" || detail === "card") setSurface(detail);
      setOpen(true);
    };
    window.addEventListener("open-agent", handler as EventListener);
    return () => window.removeEventListener("open-agent", handler as EventListener);
  }, []);

  const close = () => setOpen(false);

  return (
    <>
      {/* Floating launcher */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        <div
          className={cn(
            "flex items-center gap-1 rounded-full border border-border/60 bg-background/90 p-1 shadow-lg backdrop-blur transition-all",
            open ? "opacity-0 pointer-events-none translate-y-2" : "opacity-100",
          )}
        >
          <button
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors",
              surface === "sidebar"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setSurface("sidebar")}
            aria-label="Use sidebar"
          >
            <PanelRight className="h-3 w-3" /> Sidebar
          </button>
          <button
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors",
              surface === "card"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setSurface("card")}
            aria-label="Use card"
          >
            <LayoutGrid className="h-3 w-3" /> Card
          </button>
        </div>
        <Button
          size="icon"
          className={cn(
            "h-14 w-14 rounded-full shadow-xl transition-transform bg-gradient-to-br from-primary to-accent hover:scale-105",
            open && "scale-90 opacity-70",
          )}
          onClick={() => setOpen((o) => !o)}
          aria-label="Open agent"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>

      {surface === "sidebar" ? (
        <AgentSidebar open={open} onClose={close} />
      ) : (
        <AgentCard open={open} onClose={close} />
      )}
    </>
  );
}

export function openAgent(surface?: Surface) {
  window.dispatchEvent(new CustomEvent("open-agent", { detail: surface }));
}
