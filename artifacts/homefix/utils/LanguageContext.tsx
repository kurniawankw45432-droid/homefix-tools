// utils/LanguageContext.tsx
// Pusat sistem bahasa: deteksi otomatis dari setelan HP, simpan pilihan manual,
// dan sediakan fungsi t() untuk dipakai di semua halaman.

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { translations, LangCode, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from './i18n';

const STORAGE_KEY = 'hf_bahasa_pilihan';

type LanguageContextType = {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: string) => string;
  isReady: boolean;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: DEFAULT_LANGUAGE,
  setLang: () => {},
  t: (key: string) => key,
  isReady: false,
});

// Cocokkan kode bahasa HP (misal "id-ID", "en-US", "ms-MY") ke salah satu yang kita dukung.
// Kalau tidak ketemu, jatuh ke DEFAULT_LANGUAGE (English).
function deteksiBahasaHP(): LangCode {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const kodeUtama = (locales[0].languageCode || '').toLowerCase();
      if (SUPPORTED_LANGUAGES.includes(kodeUtama as LangCode)) {
        return kodeUtama as LangCode;
      }
    }
  } catch (e) {
    // ignore, jatuh ke default
  }
  return DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(DEFAULT_LANGUAGE);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const tersimpan = await AsyncStorage.getItem(STORAGE_KEY);
        if (tersimpan && SUPPORTED_LANGUAGES.includes(tersimpan as LangCode)) {
          // User sudah pernah pilih bahasa manual sebelumnya, pakai itu
          setLangState(tersimpan as LangCode);
        } else {
          // Belum pernah pilih manual, deteksi otomatis dari setelan HP
          const terdeteksi = deteksiBahasaHP();
          setLangState(terdeteksi);
        }
      } catch (e) {
        setLangState(DEFAULT_LANGUAGE);
      } finally {
        setIsReady(true);
      }
    };
    init();
  }, []);

  const setLang = (kodeBaru: LangCode) => {
    setLangState(kodeBaru);
    AsyncStorage.setItem(STORAGE_KEY, kodeBaru).catch(() => {});
  };

  const t = (key: string): string => {
    const kamus = translations[lang] || translations[DEFAULT_LANGUAGE];
    return kamus[key] || translations[DEFAULT_LANGUAGE][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isReady }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}