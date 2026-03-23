import { createContext, useContext, useState, useCallback, useMemo } from "react";
import en from "../translations/en";
import vi from "../translations/vi";

const translations = { en, vi };

const LanguageContext = createContext();

/**
 * Resolve a dot-separated key from a nested object.
 * e.g. resolve("settings.tabs.profile", en) → "Profile"
 */
function resolve(key, obj) {
  return key.split(".").reduce((acc, part) => acc?.[part], obj);
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(
    () => localStorage.getItem("aquaguard-lang") || "en"
  );

  const changeLanguage = useCallback((lang) => {
    setLanguage(lang);
    localStorage.setItem("aquaguard-lang", lang);
  }, []);

  /**
   * Translate a key. Falls back to English if the key isn't found
   * in the current language, then to the key itself.
   */
  const t = useCallback(
    (key) => {
      const dict = translations[language] || translations.en;
      return resolve(key, dict) ?? resolve(key, translations.en) ?? key;
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage: changeLanguage, t }),
    [language, changeLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
