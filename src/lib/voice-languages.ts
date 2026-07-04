export const VOICE_LANGUAGES: { code: string; label: string }[] = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "es-ES", label: "Español" },
  { code: "fr-FR", label: "Français" },
  { code: "de-DE", label: "Deutsch" },
  { code: "it-IT", label: "Italiano" },
  { code: "pt-BR", label: "Português (BR)" },
  { code: "nl-NL", label: "Nederlands" },
  { code: "sv-SE", label: "Svenska" },
  { code: "pl-PL", label: "Polski" },
  { code: "tr-TR", label: "Türkçe" },
  { code: "ru-RU", label: "Русский" },
  { code: "ar-SA", label: "العربية" },
  { code: "he-IL", label: "עברית" },
  { code: "hi-IN", label: "हिन्दी" },
  { code: "bn-IN", label: "বাংলা" },
  { code: "ta-IN", label: "தமிழ்" },
  { code: "te-IN", label: "తెలుగు" },
  { code: "zh-CN", label: "中文 (简体)" },
  { code: "zh-TW", label: "中文 (繁體)" },
  { code: "ja-JP", label: "日本語" },
  { code: "ko-KR", label: "한국어" },
  { code: "id-ID", label: "Bahasa Indonesia" },
  { code: "vi-VN", label: "Tiếng Việt" },
  { code: "th-TH", label: "ไทย" },
];

export function defaultVoiceLanguage(): string {
  if (typeof navigator === "undefined") return "en-US";
  const nav = navigator.language || "en-US";
  const match = VOICE_LANGUAGES.find((l) => l.code.toLowerCase() === nav.toLowerCase());
  if (match) return match.code;
  const short = nav.split("-")[0].toLowerCase();
  const byShort = VOICE_LANGUAGES.find((l) => l.code.toLowerCase().startsWith(short));
  return byShort?.code ?? "en-US";
}
