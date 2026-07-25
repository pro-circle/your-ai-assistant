import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles } from "lucide-react";
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

        <section className="mt-10 max-w-3xl space-y-4 text-muted-foreground">
          <p>
            The agent supports more than 100 languages. It auto-detects the language you
            write in and always replies in the same language, or the one you choose from
            the "Agent's Language" menu.
          </p>
          <p>
            Voice input is handled entirely by the browser's Web Speech API, so you can
            talk in your selected language without sending audio to any external service.
          </p>
          <p>
            Document RAG is session-only. PDF, DOCX, TXT, and Markdown files are parsed in
            your browser, split into overlapping chunks, and retrieved on every query so
            answers stay grounded in your material.
          </p>
          <p>
            Vision on demand lets you attach an image, screenshot, PDF, or code file
            directly inside the chat. The agent automatically switches to a multimodal
            model to analyze it.
          </p>
          <p>
            Responses stream word-by-word via a serverless proxy route so they feel
            instant, even for long generations. Everything lives in memory — refresh the
            tab and the agent starts fresh.
          </p>
          <p>
            Two interface modes are available: a retractable sidebar for focused work
            and a draggable card that can be placed anywhere on the screen.
          </p>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
          <ol className="mt-6 list-decimal space-y-3 pl-5 text-muted-foreground">
            <li>
              <strong>Upload.</strong> PDF/DOCX/TXT files are parsed in-browser and split
              into overlapping chunks.
            </li>
            <li>
              <strong>Retrieve.</strong> On each query, a keyword-scoring retriever picks
              the top chunks most relevant to your message.
            </li>
            <li>
              <strong>Prompt.</strong> The selected chunks are injected into a system prompt
              along with your chosen output language.
            </li>
            <li>
              <strong>Stream.</strong> A server route proxies the request to an
              OpenAI-compatible endpoint and streams SSE deltas back to the UI.
            </li>
            <li>
              <strong>Vision.</strong> If you attach a file inside the chat, the request
              switches to a multimodal model automatically.
            </li>
          </ol>
        </section>

        <section className="mt-16">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <div className="text-xs font-semibold uppercase tracking-wider">Tech stack</div>
          </div>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>TanStack Start (React 19 + Vite 7)</li>
            <li>Tailwind CSS v4 with semantic design tokens</li>
            <li>shadcn/ui components + lucide icons</li>
            <li>OpenAI-compatible streaming API</li>
            <li>pdfjs-dist + mammoth for in-browser parsing</li>
            <li>sonner for toast notifications</li>
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
