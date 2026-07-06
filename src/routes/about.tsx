import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Globe2, Mic, FileText, Zap, PanelRight, LayoutGrid, Shield, Eye, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Dynamic Customer Agent" },
      { name: "description", content: "How the Dynamic Customer Agent works: multilingual chat, RAG over your docs, vision analysis, and streaming answers powered by Groq." },
      { property: "og:title", content: "About — Dynamic Customer Agent" },
      { property: "og:description", content: "A detailed look at the multilingual AI support agent — architecture, features, and how it works." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <Link to="/" className="text-sm font-semibold tracking-tight sm:text-base">
            Dynamic Customer Agent
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" asChild>
              <Link to="/" className="inline-flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" /> Back
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <section className="text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">About</div>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            A multilingual AI agent, built for real conversations
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Dynamic Customer Agent is a browser-native support agent. Drop in a document,
            ask a question in any language, and get streaming, grounded answers — with
            optional vision analysis for screenshots and code files.
          </p>
        </section>

        <section className="mt-14 grid gap-4 sm:grid-cols-2">
          <Card icon={<Globe2 />} title="100+ languages">
            Auto-detects the language you write in and always replies in the same language,
            or the one you pick from the "Agent's Language" dropdown.
          </Card>
          <Card icon={<Mic />} title="Voice input">
            Uses the browser's Web Speech API to transcribe your voice in the selected
            language — no external service required.
          </Card>
          <Card icon={<FileText />} title="Document RAG">
            PDF, DOCX, TXT, and Markdown files are parsed in your browser, chunked, and
            retrieved on every query so answers stay grounded in your material.
          </Card>
          <Card icon={<Eye />} title="Vision on demand">
            Attach an image, screenshot, PDF, or code file inside the chat and the agent
            automatically switches to a multimodal model to analyze it.
          </Card>
          <Card icon={<Zap />} title="Streaming from Groq">
            Answers stream word-by-word via a serverless proxy route so responses feel
            instant, even for long generations.
          </Card>
          <Card icon={<Shield />} title="Session-only privacy">
            Documents live only in memory — nothing is stored server-side. Refresh the
            tab and the agent starts fresh.
          </Card>
          <Card icon={<PanelRight />} title="Retractable sidebar">
            A side panel that slides in from the right and stays out of your way.
          </Card>
          <Card icon={<LayoutGrid />} title="Draggable card">
            A floating card you can grab and drop anywhere — great for multi-tasking.
          </Card>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
          <ol className="mt-6 space-y-4">
            {[
              ["Upload", "PDF/DOCX/TXT files are parsed in-browser (pdfjs, mammoth) and split into overlapping chunks."],
              ["Retrieve", "On each query, a keyword-scoring retriever picks the top chunks most relevant to your message."],
              ["Prompt", "The selected chunks are injected into a system prompt along with your chosen output language."],
              ["Stream", "A server route proxies the request to Groq's OpenAI-compatible endpoint and streams SSE deltas back to the UI."],
              ["Vision", "If you attach a file inside the chat, the request switches to the multimodal model automatically."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4 rounded-2xl border border-border/60 bg-card p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </div>
                <div>
                  <div className="font-semibold">{t}</div>
                  <div className="text-sm text-muted-foreground">{d}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16 rounded-2xl border border-border/60 bg-card p-8">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <div className="text-xs font-semibold uppercase tracking-wider">Tech stack</div>
          </div>
          <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>• TanStack Start (React 19 + Vite 7)</li>
            <li>• Tailwind CSS v4 with semantic design tokens</li>
            <li>• shadcn/ui components + lucide icons</li>
            <li>• Groq OpenAI-compatible streaming API</li>
            <li>• pdfjs-dist + mammoth for in-browser parsing</li>
            <li>• sonner for toast notifications</li>
          </ul>
        </section>

        <div className="mt-12 flex justify-center">
          <Button asChild size="lg">
            <Link to="/" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
          </Button>
        </div>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-4xl items-center justify-center px-6 text-xs text-muted-foreground">
          Dynamic Customer Agent
        </div>
      </footer>
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary">
        <span className="h-5 w-5 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      </div>
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}
