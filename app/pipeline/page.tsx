"use client"

import { useCrmStore } from "@/lib/store"
import { useTranslation } from "@/lib/use-translation"
import { KpiCard } from "@/components/kpi/KpiCard"
import { PipelineChart } from "@/components/charts/PipelineChart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getGrossPipe,
  getWeightedPipe,
  getPipelineByStage,
  getColdDeals,
  formatCurrency,
} from "@/lib/calculations"

export default function PipelinePage() {
  const deals = useCrmStore((s) => s.deals)
  const { t } = useTranslation()

  const grossPipe = getGrossPipe(deals)
  const weightedPipe = getWeightedPipe(deals)
  const stageData = getPipelineByStage(deals)
  const coldDeals = getColdDeals(deals)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("pipeline.title")}</h1>
        <p className="text-muted-foreground">{t("pipeline.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label={t("pipeline.kpi.grossPipe")} value={formatCurrency(grossPipe)} />
        <KpiCard label={t("pipeline.kpi.weightedPipe")} value={formatCurrency(weightedPipe)} />
        <KpiCard label={t("pipeline.kpi.coldDeals")} value={String(coldDeals.length)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("pipeline.chart.byStage")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PipelineChart data={stageData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("pipeline.chart.detailed")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {stageData.map((row) => (
              <div key={row.stage} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-foreground">{row.stage}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.count} {row.count !== 1 ? t("common.deals") : t("common.deal")}
                  </p>
                </div>
                <p className="font-semibold text-foreground">{formatCurrency(row.value)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
