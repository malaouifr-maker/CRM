"use client"

import { useCrmStore } from "@/lib/store"
import { useTranslation } from "@/lib/use-translation"
import { KpiCard } from "@/components/kpi/KpiCard"
import { ForecastChart } from "@/components/charts/ForecastChart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getForecast,
  getForecastData,
  getWeightedPipe,
  formatCurrency,
} from "@/lib/calculations"
import { FORECAST_SHORT, FORECAST_MID, FORECAST_LONG } from "@/lib/constants"

export default function ForecastPage() {
  const deals = useCrmStore((s) => s.deals)
  const { t } = useTranslation()

  const forecastData = getForecastData(deals)
  const f30 = getForecast(deals, FORECAST_SHORT)
  const f60 = getForecast(deals, FORECAST_MID)
  const f90 = getForecast(deals, FORECAST_LONG)
  const weighted = getWeightedPipe(deals)
  const days = t("forecast.days")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("forecast.title")}</h1>
        <p className="text-muted-foreground">{t("forecast.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t("forecast.kpi.weightedPipe")} value={formatCurrency(weighted)} />
        <KpiCard label={`Forecast ${FORECAST_SHORT}${days}`} value={formatCurrency(f30)} />
        <KpiCard label={`Forecast ${FORECAST_MID}${days}`} value={formatCurrency(f60)} />
        <KpiCard label={`Forecast ${FORECAST_LONG}${days}`} value={formatCurrency(f90)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("forecast.chart.evolution")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ForecastChart data={forecastData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("forecast.chart.horizons")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {forecastData.map((row) => (
              <div key={row.label} className="flex items-center justify-between py-4">
                <p className="font-medium text-foreground">Forecast {row.label}</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(row.value)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
