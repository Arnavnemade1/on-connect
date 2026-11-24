export interface Lang { code: string; name: string; native: string; speech: string; rtl?: boolean; }
export const LANGS: Lang[] = [
  { code: "en", name: "English", native: "English", speech: "en-US" },
  { code: "es", name: "Spanish", native: "Español", speech: "es-US" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt", speech: "vi-VN" },
  { code: "zh", name: "Chinese (Simplified)", native: "中文", speech: "zh-CN" },
  { code: "hi", name: "Hindi", native: "हिन्दी", speech: "hi-IN" },
  { code: "ar", name: "Arabic", native: "العربية", speech: "ar-SA", rtl: true },
  { code: "fr", name: "French", native: "Français", speech: "fr-FR" },
  { code: "pt", name: "Portuguese", native: "Português", speech: "pt-BR" },
];
export const langOf = (code?: string) => LANGS.find(l => l.code === code) ?? LANGS[0];
