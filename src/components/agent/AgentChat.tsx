import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import ReactMarkdown from "react-markdown";
import {
  Send,
  Paperclip,
  X,
  Loader2,
  FileText,
  User,
  StopCircle,
  Image as ImageIcon,
  Languages,
  RotateCcw,
  Briefcase,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { readChatAttachment, readChatAttachmentFromBlob } from "@/lib/chat-attachment";
import {
  getDocs,
  subscribeDocs,
  ingestFile,
  removeDocAt,
} from "@/lib/doc-store";
import { VoiceInput } from "./VoiceInput";
import { VOICE_LANGUAGES } from "@/lib/voice-languages";
import {
  clearChat,
  getChatState,
  setAgentDomain,
  setAgentLang,
  setChatState,
  setMessages,
  subscribeChat,
  type UIMessage,
} from "@/lib/chat-store";
import agentAvatar from "@/assets/agent-avatar.png";
import { toast } from "sonner";

const NO_DOC_MESSAGE = [
  "Before I can answer, I need a document to work from. Please upload one first 📄",
  "",
  "**How to upload:**",
  "1. Click the **Upload doc** button (the upload icon next to the paperclip below), or use the **Upload docs** section on the page.",
  "2. Choose a **PDF, DOCX, TXT or MD** file — up to **15 MB** each.",
  "3. Wait for the file chip to appear at the top of this chat.",
  "4. Then ask your question — I'll answer using that document.",
  "",
  "Tip: you can also set **Agent Domain** in the header (e.g. \"medical shop agent\") so I answer in the right role.",
].join("\n");


const CHAT_FILE_ACCEPT =
  "image/*,.pdf,.docx,.txt,.md,.js,.jsx,.ts,.tsx,.py,.java,.c,.cc,.cpp,.cs,.go,.rs,.rb,.php,.html,.css,.json,.yml,.yaml,.xml,.sh,.sql,.swift,.kt,.dart,.lua,.r,.toml,.ini,.log,.vue,.svelte";

// Sending is per-mount (a stream can only run where it was started).
type LocalState = {
  interim: string;
  sending: boolean;
  attaching: boolean;
  uploading: boolean;
  error: string | null;
};

export function AgentChat({ onClose }: { onClose?: () => void }) {
  const docs = useSyncExternalStore(subscribeDocs, getDocs, getDocs);
  const chat = useSyncExternalStore(subscribeChat, getChatState, getChatState);
  const { messages, input, attachment, agentLang, domain } = chat;
  const [domainOpen, setDomainOpen] = useState(false);
  const [domainDraft, setDomainDraft] = useState(domain);

  // Local ephemeral state (per mount)
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);
  const localRef = useRef<LocalState>({
    interim: "",
    sending: false,
    attaching: false,
    uploading: false,
    error: null,
  });
  const local = localRef.current;


  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const allChunks = useMemo(() => docs.flatMap((d) => d.chunks), [docs]);
  const agentLangLabel = useMemo(
    () => VOICE_LANGUAGES.find((l) => l.code === agentLang)?.label ?? agentLang,
    [agentLang],
  );

  // Track whether the user is near the bottom; only auto-scroll then.
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distance < 80;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickToBottomRef.current) return;
    // instant scroll -> no shiver, doesn't fight the user
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      setChatState((s) => ({ input: (s.input + " " + text).trim() }));
      local.interim = "";
      rerender();
    } else {
      local.interim = text;
      rerender();
    }
  }, [local]);

  const handleDocFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    local.uploading = true;
    local.error = null;
    rerender();
    try {
      for (const f of Array.from(files)) {
        try {
          await ingestFile(f);
          toast.success(`${f.name} added to knowledge`);
        } catch (e) {
          const msg = `Failed to read ${f.name}: ${e instanceof Error ? e.message : "unknown"}`;
          local.error = msg;
          toast.error(msg);
        }
      }
    } finally {
      local.uploading = false;
      rerender();
      if (docInputRef.current) docInputRef.current.value = "";
    }
  }, [local]);

  const handleChatFile = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    local.attaching = true;
    local.error = null;
    rerender();
    try {
      const att = await readChatAttachment(file);
      setChatState({ attachment: att });
      toast.success(`Attached ${att.name}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to read file";
      local.error = msg;
      toast.error(msg);
    } finally {
      local.attaching = false;
      rerender();
      if (chatFileInputRef.current) chatFileInputRef.current.value = "";
    }
  }, [local]);

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of Array.from(items)) {
        if (it.kind === "file") {
          const blob = it.getAsFile();
          if (!blob) continue;
          e.preventDefault();
          local.attaching = true;
          rerender();
          try {
            const att = await readChatAttachmentFromBlob(blob);
            setChatState({ attachment: att });
            toast.success(`Attached ${att.name}`);
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to read pasted file";
            local.error = msg;
            toast.error(msg);
          } finally {
            local.attaching = false;
            rerender();
          }
          return;
        }
      }
    },
    [local],
  );

  const send = useCallback(async () => {
    const text = (input + " " + local.interim).trim();
    if ((!text && !attachment) || local.sending) return;
    local.error = null;
    local.interim = "";
    const displayText =
      text || (attachment ? `Please analyze the attached file: ${attachment.name}` : "");
    const userMsg: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: attachment ? `${displayText}\n\n📎 ${attachment.name}` : displayText,
    };

    // Gate: the agent only answers once at least one document is loaded.
    if (docs.length === 0) {
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: crypto.randomUUID(), role: "assistant", content: NO_DOC_MESSAGE },
      ]);
      setChatState({ input: "", attachment: null });
      stickToBottomRef.current = true;
      rerender();
      toast.info("Upload a document first so the agent can answer.");
      return;
    }

    const assistantId = crypto.randomUUID();
    const placeholder: UIMessage = { id: assistantId, role: "assistant", content: "" };
    setMessages((prev) => [...prev, userMsg, placeholder]);
    const currentAttachment = attachment;
    setChatState({ input: "", attachment: null });
    local.sending = true;
    stickToBottomRef.current = true;
    rerender();

    const contextChunks = retrieve(displayText, allChunks, 6).map(
      (c) => `Source: ${c.source}\n${c.text}`,
    );

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const history: ChatMessage[] = [
        ...messages
          .filter((m) => m.id !== "welcome")
          .map(({ role, content }) => ({ role, content }) as ChatMessage),
        { role: "user", content: displayText },
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
        { attachment: currentAttachment, outputLanguage: agentLangLabel, domain },
      );
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        toast.info("Response stopped.");
      } else {
        const raw = e instanceof Error ? e.message : "Something went wrong.";
        const offline = typeof navigator !== "undefined" && !navigator.onLine;
        const msg = offline
          ? "Agent unavailable — connect to network and try again."
          : /fetch|network|failed|load/i.test(raw)
            ? `Agent unavailable — ${raw}`
            : raw;
        local.error = msg;
        toast.error(msg);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      }
    } finally {
      local.sending = false;
      abortRef.current = null;
      rerender();
      inputRef.current?.focus();
    }
  }, [input, attachment, messages, allChunks, agentLangLabel, domain, docs.length, local]);

  const stop = () => abortRef.current?.abort();

  const handleClear = () => {
    if (local.sending) abortRef.current?.abort();
    clearChat();
    toast.success("Chat cleared");
  };

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <a
            href="https://github.com/hgjguo"
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-sm font-semibold hover:underline"
            title="Contact developer"
          >
            Dynamic Customer Agent — Contact Developer
          </a>
          <div className="truncate text-xs text-muted-foreground">
            {docs.length > 0
              ? `${docs.length} doc${docs.length > 1 ? "s" : ""} loaded`
              : "Upload a doc to start"}
            {domain ? ` · ${domain}` : ""}
          </div>
        </div>
        <Button
          variant={domain ? "secondary" : "ghost"}
          size="icon"
          onClick={() => {
            setDomainDraft(domain);
            setDomainOpen((o) => !o);
          }}
          aria-label="Agent Domain"
          title="Agent Domain"
        >
          <Briefcase className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClear}
          aria-label="Clear chat"
          title="Clear chat"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1.5">
          <Languages className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={agentLang} onValueChange={setAgentLang}>
            <SelectTrigger
              className="h-8 w-[130px] text-xs"
              aria-label="Agent's language"
              title="Agent's language"
            >
              <SelectValue placeholder="Agent's Language" />
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
      </div>

      {/* Agent Domain mini card */}
      {domainOpen && (
        <div className="border-b border-border/60 bg-muted/30 px-3 py-3">
          <div className="rounded-xl border border-border/60 bg-card p-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Briefcase className="h-4 w-4 text-primary" />
              Agent Domain
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Describe the role this agent should play — it becomes part of its system prompt.
            </p>
            <Input
              value={domainDraft}
              onChange={(e) => setDomainDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setAgentDomain(domainDraft.trim());
                  setDomainOpen(false);
                  toast.success(
                    domainDraft.trim() ? `Domain set: ${domainDraft.trim()}` : "Domain cleared",
                  );
                }
              }}
              placeholder="e.g. medical shop agent, logistics service agent…"
              maxLength={200}
              className="mt-3 h-9 text-sm"
            />
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setAgentDomain(domainDraft.trim());
                  setDomainOpen(false);
                  toast.success(
                    domainDraft.trim() ? `Domain set: ${domainDraft.trim()}` : "Domain cleared",
                  );
                }}
              >
                Save domain
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setDomainDraft("");
                  setAgentDomain("");
                  toast.info("Domain cleared");
                }}
              >
                Clear
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto"
                onClick={() => setDomainOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}


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

      {/* Messages — overscroll-contain so scroll stays inside; instant scroll avoids shiver */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4"
        style={{ scrollBehavior: "auto" }}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}
          >
            {m.role === "assistant" && (
              <img
                src={agentAvatar}
                alt="Agent"
                width={28}
                height={28}
                loading="lazy"
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
        {local.error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {local.error}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border/60 bg-background/80 p-3 backdrop-blur">
        {attachment && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1.5 text-xs">
            {attachment.kind === "image" ? (
              <ImageIcon className="h-3.5 w-3.5 text-primary" />
            ) : (
              <FileText className="h-3.5 w-3.5 text-primary" />
            )}
            <span className="max-w-[220px] truncate">{attachment.name}</span>
            <span className="text-muted-foreground">· analyzed with vision model</span>
            <button
              className="ml-auto text-muted-foreground hover:text-foreground"
              onClick={() => setChatState({ attachment: null })}
              aria-label="Remove attachment"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            multiple
            className="hidden"
            onChange={(e) => handleDocFiles(e.target.files)}
          />
          <input
            ref={chatFileInputRef}
            type="file"
            accept={CHAT_FILE_ACCEPT}
            className="hidden"
            onChange={(e) => handleChatFile(e.target.files)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={local.attaching || local.sending}
            onClick={() => chatFileInputRef.current?.click()}
            aria-label="Attach file (image, doc, or code)"
            title="Attach an image, doc, or code file — or paste one directly"
          >
            {local.attaching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </Button>
          <VoiceInput language={agentLang} onTranscript={handleTranscript} disabled={local.sending} />
          <Textarea
            ref={inputRef}
            value={local.interim ? input + " " + local.interim : input}
            onChange={(e) => {
              setChatState({ input: e.target.value });
              local.interim = "";
            }}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={
              attachment ? "Ask about the attached file…" : "Type or paste an image…"
            }
            rows={1}
            className="min-h-[40px] max-h-32 resize-none"
          />
          {local.sending ? (
            <Button type="button" size="icon" variant="destructive" onClick={stop} aria-label="Stop">
              <StopCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              onClick={send}
              disabled={!input.trim() && !local.interim.trim() && !attachment}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        {local.uploading && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Parsing document…
          </div>
        )}
      </div>
    </div>
  );
}

