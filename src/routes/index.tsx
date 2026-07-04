import { createFileRoute } from "@tanstack/react-router";
import {
  Bot,
  Sparkles,
  Globe2,
  Mic,
  FileText,
  Zap,
  PanelRight,
  LayoutGrid,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { openAgent } from "@/components/agent/AgentLauncher";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <a href="#top" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md">
              <Bot className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold tracking-tight sm:text-base">
              Dynamic Customer Agent
            </span>
          </a>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#surfaces" className="hover:text-foreground">Interfaces</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" asChild>
              <a href="#features">Learn more</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div
            className="absolute left-1/2 top-[-15%] h-[600px] w-[900px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, var(--brand-glow) 0%, transparent 60%)",
            }}
          />
        </div>
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            Multilingual · RAG-powered · Real-time streaming
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            The customer agent that speaks{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, var(--brand) 0%, var(--brand-glow) 100%)",
              }}
            >
              every language
            </span>
            .
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Drop in a PDF or Word doc. Ask by voice or text in any language. Get
            instant, streaming answers — inside a retractable sidebar or a
            draggable card, wherever you need it.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" onClick={() => openAgent()} className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Try the agent
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#features" className="gap-2">
                Learn more <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
          <div className="mt-14 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <Kbd>PDF</Kbd>
            <Kbd>DOCX</Kbd>
            <Kbd>Voice input</Kbd>
            <Kbd>Auto language</Kbd>
            <Kbd>Word-by-word streaming</Kbd>
            <Kbd>Dark / Light</Kbd>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeader
            eyebrow="Features"
            title="Everything a modern support agent needs"
            subtitle="Built for real conversations with real customers, in every language they speak."
          />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={<Globe2 />}
              title="Auto language detection"
              body="Type in any language — the agent detects it and always replies in the same language, automatically."
            />
            <Feature
              icon={<Mic />}
              title="Voice input, your language"
              body="Talk to the agent using your browser's mic. Pick your speech language before you start."
            />
            <Feature
              icon={<FileText />}
              title="Document RAG"
              body="Upload PDF, Word, or text files. The agent grounds answers in your documents, in-session."
            />
            <Feature
              icon={<Zap />}
              title="Word-by-word streaming"
              body="Powered by Groq for ultra-fast, streaming responses that feel instant."
            />
            <Feature
              icon={<PanelRight />}
              title="Retractable sidebar"
              body="A distraction-free side panel that slides in when you need it and disappears when you don't."
            />
            <Feature
              icon={<LayoutGrid />}
              title="Draggable card"
              body="Prefer a floating card? Grab the handle and drop it anywhere on your screen."
            />
          </div>
        </div>
      </section>

      {/* Surfaces */}
      <section id="surfaces" className="border-t border-border/60 bg-muted/20 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeader
            eyebrow="Two ways to chat"
            title="Sidebar or card — you choose"
            subtitle="Switch anytime from the launcher. Your preference is remembered on this device."
          />
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <SurfaceCard
              icon={<PanelRight />}
              title="Sidebar"
              body="A retractable panel that anchors to the right edge. Perfect for focused workflows."
              cta="Open sidebar"
              onClick={() => openAgent("sidebar")}
            />
            <SurfaceCard
              icon={<LayoutGrid />}
              title="Draggable card"
              body="A floating card you can position anywhere. Great for multi-tasking across the page."
              cta="Open card"
              onClick={() => openAgent("card")}
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <SectionHeader
            eyebrow="How it works"
            title="Three steps to answers"
          />
          <ol className="mt-14 space-y-6">
            {[
              {
                t: "Upload your docs",
                d: "Drop in a PDF or Word file. It's parsed and chunked in your browser — nothing leaves your session.",
              },
              {
                t: "Ask in any language",
                d: "Type or speak. The agent finds the most relevant chunks and asks Groq to answer, in your language.",
              },
              {
                t: "Watch it stream",
                d: "Responses stream in word-by-word so you get the answer as fast as the model can generate it.",
              },
            ].map((s, i) => (
              <li
                key={s.t}
                className="flex gap-4 rounded-2xl border border-border/60 bg-card p-5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </div>
                <div>
                  <div className="font-semibold">{s.t}</div>
                  <div className="text-sm text-muted-foreground">{s.d}</div>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex justify-center">
            <Button size="lg" onClick={() => openAgent()} className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Start chatting
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Bot className="h-3.5 w-3.5" />
            Dynamic Customer Agent
          </div>
          <div>Powered by Groq · Built with Lovable</div>
        </div>
      </footer>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-1 font-mono">
      {children}
    </span>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="text-xs font-semibold uppercase tracking-wider text-primary">
        {eyebrow}
      </div>
      <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {subtitle && (
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">{subtitle}</p>
      )}
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="group relative rounded-2xl border border-border/60 bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary">
        <span className="h-5 w-5 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      </div>
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{body}</div>
    </div>
  );
}

function SurfaceCard({
  icon,
  title,
  body,
  cta,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-8">
      <div>
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
          <span className="h-5 w-5 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
        </div>
        <div className="text-lg font-semibold">{title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{body}</div>
      </div>
      <Button className="mt-6 w-fit gap-2" onClick={onClick}>
        {cta} <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
