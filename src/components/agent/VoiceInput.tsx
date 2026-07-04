import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";

// Minimal typings for the browser Web Speech API.
interface SpeechRecognitionEvent extends Event {
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
  resultIndex: number;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SR = any;

export function VoiceInput({
  language,
  onTranscript,
  disabled,
}: {
  language: string;
  onTranscript: (text: string, isFinal: boolean) => void;
  disabled?: boolean;
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SR | null>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SRClass = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SRClass) {
      setSupported(false);
      return;
    }
    const rec: SR = new SRClass();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = language;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0].transcript;
        if (r.isFinal) final += t;
        else interim += t;
      }
      if (final) onTranscript(final, true);
      else if (interim) onTranscript(interim, false);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    };
  }, [language, onTranscript]);

  if (!supported) {
    return (
      <Button variant="ghost" size="icon" disabled title="Voice input not supported in this browser">
        <MicOff className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={listening ? "default" : "ghost"}
      size="icon"
      disabled={disabled}
      onClick={() => {
        const rec = recRef.current;
        if (!rec) return;
        if (listening) {
          rec.stop();
          setListening(false);
        } else {
          try {
            rec.lang = language;
            rec.start();
            setListening(true);
          } catch {
            /* already started */
          }
        }
      }}
      aria-label={listening ? "Stop voice input" : "Start voice input"}
    >
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}
