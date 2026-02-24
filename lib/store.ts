import { create } from "zustand"
import type { Deal } from "@/types/deal"

interface CrmStore {
  deals: Deal[]
  uploadedAt: Date | null
  setDeals: (deals: Deal[]) => void
  clear: () => void
}

export const useCrmStore = create<CrmStore>((set) => ({
  deals: [],
  uploadedAt: null,
  setDeals: (deals) => set({ deals, uploadedAt: new Date() }),
  clear: () => set({ deals: [], uploadedAt: null }),
}))
