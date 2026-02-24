import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Lang } from "./i18n"

interface LanguageStore {
  lang: Lang
  setLang: (lang: Lang) => void
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      lang: "fr",
      setLang: (lang) => set({ lang }),
    }),
    { name: "crm-language" }
  )
)
