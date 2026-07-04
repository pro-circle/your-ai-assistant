# Dynamic Customer Agent — Build Plan

A static marketing landing page with an embedded multilingual AI chat agent powered by Groq, featuring session-only document RAG, a draggable card and retractable sidebar surface, voice input, and dark/light mode. No backend, no persistence — everything runs in-browser except the Groq proxy call.

## 1. Setup & Secrets

- Ask user for **GROQ_API_KEY** via `secrets--add_secret` (stored server-side).
- Create a single TanStack server route `src/routes/api/chat.ts` that proxies to Groq's OpenAI-compatible `/openai/v1/chat/completions` endpoint with `stream: true`. Model: `openai/gpt-oss-120` (fast, multilingual).
- No Lovable Cloud, no database.

## 2. Landing Page (`src/routes/index.tsx`)

- Hero: "Dynamic Customer Agent" headline, tagline, primary CTA **[Learn more]** scrolls to features, secondary **[Try the agent]** opens the agent.
- Sections: Features (multilingual, voice, RAG, streaming), How it works, Footer.
- Sticky nav bar with app name, Learn more link, theme toggle, and floating **message icon** (bottom-right) to open the agent.
- Design: modern, clean, gradient accents, semantic tokens in `src/styles.css` (define new tokens for brand/accent). Dark/light mode via `.dark` class on `<html>` with a toggle stored in `localStorage`.

## 3. Agent UI — Two Surfaces

User picks preference (persisted in localStorage): **Sidebar** or **Card**. The floating message icon opens whichever is selected. A settings toggle inside the agent lets them switch.

### Sidebar

- Retractable right-side panel (`Sheet` from shadcn or custom slide-in). Fixed width on desktop, full-width on mobile. Collapse/expand button.

### Draggable Card

- Free-floating card, draggable anywhere on screen via header drag handle (pointer events, clamp to viewport). Resizable optional. Minimize/close buttons.

Both surfaces render the same `<AgentChat>` component so logic is shared.

## 4. Agent Chat Component (`src/components/agent/`)

- **Message list**: user/assistant bubbles, markdown rendering (`react-markdown`), word-by-word streaming display as tokens arrive from Groq.
- **Composer**: textarea, send button, voice input mic button, file upload button, language selector dropdown for voice input (default = browser language; user can override before recording).
- **Voice input**: Web Speech API (`webkitSpeechRecognition`). Language code from selector. Live transcription fills the composer.
- **Language auto-detect for typed text**: send user message to Groq with a system instruction to reply in the user's detected language. No client-side detection needed — the model handles it.
- **Streaming**: parse SSE from the server route, append deltas token-by-token.
- **File upload (RAG)**:
  - Accept `.pdf`, `.docx`, `.txt`.
  - Parse in-browser: `pdfjs-dist` for PDF, `mammoth` for DOCX.
  - Chunk text (~800 chars, 100 overlap), store chunks in memory (React state / context).
  - **Simple retrieval**: no embeddings (keeps it session-only and keyless). Use TF-IDF-style keyword scoring or basic term-overlap ranking across chunks; pick top 4 chunks per query and inject into the system prompt as context.
  - Show uploaded file chips with remove button.

## 5. Server Route — Groq Proxy

`POST /api/chat` accepts `{ messages, contextChunks? }`. Builds:

```
system: "You are a helpful multilingual customer support agent. Always reply in the same language the user wrote in. Use the provided document context when relevant. Context:\n<chunks>"
```

Streams Groq response back as SSE (`text/event-stream`). Handles 401/429/402 with clear errors surfaced to the UI.

## 6. Theme

- `ThemeProvider` context, toggle in nav. Persist choice in `localStorage`. Class-based dark mode on `<html>`.
- Define brand tokens (primary, accent, gradient, glow) in `src/styles.css` for both `:root` and `.dark`.

## 7. Files to Create

- `src/routes/index.tsx` — landing page (replace placeholder)
- `src/routes/api/chat.ts` — Groq streaming proxy
- `src/components/agent/AgentChat.tsx` — shared chat UI
- `src/components/agent/AgentSidebar.tsx` — sidebar surface
- `src/components/agent/AgentCard.tsx` — draggable card surface
- `src/components/agent/AgentLauncher.tsx` — floating message icon + surface preference
- `src/components/agent/VoiceInput.tsx` — Web Speech API hook + button
- `src/components/agent/FileUpload.tsx` — PDF/DOCX parse + chunk
- `src/lib/rag.ts` — chunker + keyword retrieval
- `src/lib/groq-stream.ts` — client SSE parser
- `src/components/theme-provider.tsx` + `ThemeToggle.tsx`
- `src/routes/__root.tsx` — update head metadata (title, description, og)
- `src/styles.css` — add brand tokens

## 8. Packages

`bun add react-markdown pdfjs-dist mammoth` (no embeddings lib needed).

## 9. Out of Scope

- Auth, database, persistent chat history, per-user documents, embeddings-based RAG, backend document storage.