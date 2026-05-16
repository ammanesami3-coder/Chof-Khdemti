'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { translations, type Lang, type TranslationKey } from './translations';

const STORAGE_KEY = 'preferredLanguage';
const VALID_LANGS: Lang[] = ['ar', 'fr', 'en'];

type LangContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
  dir: 'rtl' | 'ltr';
};

const LangContext = createContext<LangContextValue>({
  lang: 'ar',
  setLang: () => {},
  t: (key) => translations.ar[key],
  dir: 'rtl',
});

function applyLangToDOM(lang: Lang) {
  const root = document.documentElement;
  root.lang = lang;
  root.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved && VALID_LANGS.includes(saved)) {
      setLangState(saved);
      applyLangToDOM(saved);
    }
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
    applyLangToDOM(l);
  }

  function t(key: TranslationKey): string {
    const dict = translations[lang] as Record<string, string>;
    return dict[key] ?? (translations.ar as Record<string, string>)[key] ?? key;
  }

  const dir: 'rtl' | 'ltr' = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <LangContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
