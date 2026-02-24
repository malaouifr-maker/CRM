import { useLanguageStore } from "./language-store"
import { translations, type TranslationKey } from "./i18n"

export function useTranslation() {
  const lang = useLanguageStore((s) => s.lang)

  function t(key: TranslationKey): string {
    return translations[lang][key] ?? key
  }

  return { t, lang }
}
