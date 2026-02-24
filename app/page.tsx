"use client"

import { useCrmStore } from "@/lib/store"
import { useTranslation } from "@/lib/use-translation"
import { CsvUploader } from "@/components/upload/CsvUploader"
import { KpiCard } from "@/components/kpi/KpiCard"
import { ForecastChart } from "@/components/charts/ForecastChart"
import { PriorityActions } from "@/components/alerts/PriorityActions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getGrossPipe,
  getWeightedPipe,
  getWonDeals,
  getConversionRate,
  getForecastData,
  formatCurrency,
} from "@/lib/calculations"

export default function HomePage() {
  const deals = useCrmStore((s) => s.deals)
  const uploadedAt = useCrmStore((s) => s.uploadedAt)
  const { t } = useTranslation()

  const grossPipe = getGrossPipe(deals)
  const weightedPipe = getWeightedPipe(deals)
  const wonDeals = getWonDeals(deals)
  const conversionRate = getConversionRate(deals)
  const forecastData = getForecastData(deals)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("home.title")}</h1>
        <p className="text-muted-foreground">{t("home.subtitle")}</p>
      </div>

      <CsvUploader />

      {uploadedAt && deals.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label={t("home.kpi.grossPipe")} value={formatCurrency(grossPipe)} />
            <KpiCard label={t("home.kpi.weightedPipe")} value={formatCurrency(weightedPipe)} />
            <KpiCard label={t("home.kpi.closedWon")} value={String(wonDeals.length)} />
            <KpiCard
              label={t("home.kpi.conversionRate")}
              value={`${(conversionRate * 100).toFixed(1)}%`}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("home.chart.forecast")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ForecastChart data={forecastData} />
            </CardContent>
          </Card>

          <div>
            <h2 className="mb-4 text-lg font-semibold text-foreground">{t("home.priorityActions")}</h2>
            <PriorityActions deals={deals} />
          </div>
        </>
      )}

      {!uploadedAt && (
        <p className="text-center text-sm text-muted-foreground">
          {t("home.noData")}
        </p>
      )}
    </div>
  )
}
