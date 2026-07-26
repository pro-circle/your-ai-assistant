import type { ChatAttachment, ChatMessage } from "./stream-chat";
import { defaultVoiceLanguage } from "./voice-languages";
import { welcomeMessageFor } from "./welcome-messages";

export type UIMessage = ChatMessage & { id: string };

export type ChatState = {
  messages: UIMessage[];
  input: string;
  attachment: ChatAttachment | null;
  agentLang: string;
  domain: string;
};

const listeners = new Set<() => void>();

function makeWelcome(lang: string): UIMessage {
  return { id: "welcome", role: "assistant", content: welcomeMessageFor(lang) };
}

const initialLang = defaultVoiceLanguage();

let state: ChatState = {
  messages: [makeWelcome(initialLang)],
  input: "",
  attachment: null,
  agentLang: initialLang,
  domain: "",
};

export function getChatState(): ChatState {
  return state;
}

export function subscribeChat(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit() {
  for (const cb of listeners) cb();
}

export function setChatState(patch: Partial<ChatState> | ((s: ChatState) => Partial<ChatState>)) {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  emit();
}

export function setMessages(updater: (prev: UIMessage[]) => UIMessage[]) {
  state = { ...state, messages: updater(state.messages) };
  emit();
}

export function setAgentDomain(domain: string) {
  state = { ...state, domain };
  emit();
}

export function setAgentLang(lang: string) {
  state = {
    ...state,
    agentLang: lang,
    messages: state.messages.map((m) =>
      m.id === "welcome" ? { ...m, content: welcomeMessageFor(lang) } : m,
    ),
  };
  emit();
}

export function clearChat() {
  state = {
    ...state,
    messages: [makeWelcome(state.agentLang)],
    input: "",
    attachment: null,
  };
  emit();
}
