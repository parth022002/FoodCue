import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { SupportedLanguage, TranslationDictionary } from "./types";
import { SUPPORTED_LANGUAGES } from "./types";
import { en } from "./translations/en";
import { hi } from "./translations/hi";
import { mr } from "./translations/mr";
import { ta } from "./translations/ta";
import { te } from "./translations/te";
import { Globe } from "lucide-react";

export * from "./types";

const dictionaries: Record<SupportedLanguage, TranslationDictionary> = {
  en,
  hi,
  mr,
  ta,
  te
};

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: TranslationDictionary;
  languages: typeof SUPPORTED_LANGUAGES;
}

const STORAGE_KEY = "foodcue_preferred_language";

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => {},
  t: en,
  languages: SUPPORTED_LANGUAGES
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage;
      if (saved && (saved in dictionaries)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return "en";
  });

  const setLanguage = (newLang: SupportedLanguage) => {
    if (newLang in dictionaries) {
      setLanguageState(newLang);
      try {
        localStorage.setItem(STORAGE_KEY, newLang);
        document.documentElement.lang = newLang;
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch {
      // ignore
    }
  }, [language]);

  const value: LanguageContextValue = {
    language,
    setLanguage,
    t: dictionaries[language] || en,
    languages: SUPPORTED_LANGUAGES
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}

export function LanguageSelector({
  className = "",
  compact = false
}: {
  className?: string;
  compact?: boolean;
}) {
  const { language, setLanguage, languages } = useTranslation();

  return (
    <div className={`language-selector-wrapper ${className}`} aria-label="Select language">
      <div className="language-selector-inner">
        <Globe className="lang-icon" aria-hidden="true" size={16} />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
          className="lang-select-input"
          aria-label="Language selector"
        >
          {languages.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {compact ? opt.code.toUpperCase() : `${opt.nativeName} (${opt.name})`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
