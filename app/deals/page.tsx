"use client"

import { useCrmStore } from "@/lib/store"
import { useTranslation } from "@/lib/use-translation"
import { DealsTable } from "@/components/tables/DealsTable"
import { CsvUploader } from "@/components/upload/CsvUploader"

export default function DealsPage() {
  const deals = useCrmStore((s) => s.deals)
  const uploadedAt = useCrmStore((s) => s.uploadedAt)
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("deals.title")}</h1>
        <p className="text-muted-foreground">{t("deals.subtitle")}</p>
      </div>

      {!uploadedAt ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("deals.noData")}</p>
          <CsvUploader />
        </div>
      ) : (
        <DealsTable deals={deals} />
      )}
    </div>
  )
}
