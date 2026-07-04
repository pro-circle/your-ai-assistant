import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Paperclip, X, Loader2, FileText, User, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { retrieve } from "@/lib/rag";
import { streamChat, type ChatMessage } from "@/lib/stream-chat";
import {
  getDocs,
  subscribeDocs,
  ingestFile,
  removeDocAt,
} from "@/lib/doc-store";
import { VoiceInput } from "./VoiceInput";
import { VOICE_LANGUAGES, defaultVoiceLanguage } from "@/lib/voice-languages";
import agentAvatar from "@/assets/agent-avatar.png.asset.json";

type UIMessage = ChatMessage & { id: string };

export function AgentChat({ onClose }: { onClose?: () => void }) {
  const docs = useSyncExternalStore(subscribeDocs, getDocs, getDocs);
  const [messages, setMessages] = useState<UIMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 Hi! I'm the Dynamic Customer Agent. Ask me anything — I reply in your language. Upload a PDF, Word, or TXT doc and I'll answer from it.",
    },
  ]);
  const [input, setInput] = useState("");
  const [interim, setInterim] = useState("");
  const [voiceLang, setVoiceLang] = useState<string>(defaultVoiceLanguage());
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const allChunks = useMemo(() => docs.flatMap((d) => d.chunks), [docs]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      setInput((p) => (p + " " + text).trim());
      setInterim("");
    } else {
      setInterim(text);
    }
  }, []);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const f of Array.from(files)) {
        try {
          await ingestFile(f);
        } catch (e) {
          setError(`Failed to read ${f.name}: ${e instanceof Error ? e.message : "unknown"}`);
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  const send = useCallback(async () => {
    const text = (input + " " + interim).trim();
    if (!text || sending) return;
    setError(null);
    setInterim("");
    const userMsg: UIMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantId = crypto.randomUUID();
    const placeholder: UIMessage = { id: assistantId, role: "assistant", content: "" };
    setMessages((prev) => [...prev, userMsg, placeholder]);
    setInput("");
    setSending(true);

    const contextChunks = retrieve(text, allChunks, 6).map(
      (c) => `Source: ${c.source}\n${c.text}`,
    );

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const history: ChatMessage[] = [
        ...messages
          .filter((m) => m.id !== "welcome")
          .map(({ role, content }) => ({ role, content }) as ChatMessage),
        { role: "user", content: text },
      ];
      await streamChat(
        history,
        contextChunks,
        (delta) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m)),
          );
        },
        controller.signal,
      );
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        // stopped by user
      } else {
        const msg = e instanceof Error ? e.message : "Something went wrong.";
        setError(msg);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      }
    } finally {
      setSending(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }, [input, interim, sending, messages, allChunks]);

  const stop = () => abortRef.current?.abort();

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {/* Header — close on the left */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          )}
          <div>
            <div className="text-sm font-semibold">Dynamic Customer Agent</div>
            <div className="text-xs text-muted-foreground">
              {docs.length > 0
                ? `${docs.length} doc${docs.length > 1 ? "s" : ""} loaded`
                : "Ask anything in any language"}
            </div>
          </div>
        </div>
      </div>

      {/* Doc chips */}
      {docs.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-border/60 px-4 py-2">
          {docs.map((d, i) => (
            <div
              key={d.name + i}
              className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs"
            >
              <FileText className="h-3 w-3" />
              <span className="max-w-[140px] truncate">{d.name}</span>
              <button
                className="text-muted-foreground hover:text-foreground"
                onClick={() => removeDocAt(i)}
                aria-label={`Remove ${d.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}
          >
            {m.role === "assistant" && (
              <img
                src={agentAvatar.url}
                alt="Agent"
                className="mt-1 h-7 w-7 shrink-0 rounded-full object-cover"
              />
            )}
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-foreground",
              )}
            >
              {m.role === "assistant" ? (
                m.content ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-2">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )
              ) : (
                <div className="whitespace-pre-wrap">{m.content}</div>
              )}
            </div>
            {m.role === "user" && (
              <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <User className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        ))}
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border/60 bg-background/80 p-3 backdrop-blur">
        <div className="flex items-center gap-2 pb-2">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Voice</span>
          <Select value={voiceLang} onValueChange={setVoiceLang}>
            <SelectTrigger className="h-7 w-[160px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VOICE_LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code} className="text-xs">
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach document"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </Button>
          <VoiceInput language={voiceLang} onTranscript={handleTranscript} disabled={sending} />
          <Textarea
            ref={inputRef}
            value={interim ? input + " " + interim : input}
            onChange={(e) => {
              setInput(e.target.value);
              setInterim("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type in any language…"
            rows={1}
            className="min-h-[40px] max-h-32 resize-none"
          />
          {sending ? (
            <Button type="button" size="icon" variant="destructive" onClick={stop} aria-label="Stop">
              <StopCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              onClick={send}
              disabled={!input.trim() && !interim.trim()}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
