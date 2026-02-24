"use client"

import { useCallback, useState } from "react"
import { Upload, X, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { parseCsvFile } from "@/lib/csv-parser"
import { useCrmStore } from "@/lib/store"
import { useTranslation } from "@/lib/use-translation"
import { cn } from "@/lib/utils"

export function CsvUploader() {
  const setDeals = useCrmStore((s) => s.setDeals)
  const clear = useCrmStore((s) => s.clear)
  const uploadedAt = useCrmStore((s) => s.uploadedAt)
  const dealsCount = useCrmStore((s) => s.deals.length)
  const { t } = useTranslation()

  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".csv")) {
        setError(t("csv.errorNotCsv"))
        return
      }
      setError(null)
      setLoading(true)
      try {
        const deals = await parseCsvFile(file)
        setDeals(deals)
      } catch {
        setError(t("csv.errorRead"))
      } finally {
        setLoading(false)
      }
    },
    [setDeals, t]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  if (uploadedAt) {
    return (
      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {dealsCount} {dealsCount !== 1 ? t("common.deals") : t("common.deal")} {t("csv.imported")}
            </p>
            <p className="text-xs text-muted-foreground">
              {uploadedAt.toLocaleString("fr-FR")}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={clear} aria-label={t("csv.deleteData")}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors",
        dragging
          ? "border-primary bg-primary/5"
          : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">
        {t("csv.dragHere")}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{t("csv.or")}</p>
      <label className="mt-3 cursor-pointer">
        <Button variant="outline" size="sm" asChild>
          <span>{t("csv.browse")}</span>
        </Button>
        <input
          type="file"
          accept=".csv"
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </label>
      {loading && <p className="mt-3 text-xs text-muted-foreground">{t("csv.loading")}</p>}
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </div>
  )
}
