"use client"

import { useCrmStore } from "@/lib/store"
import { useTranslation } from "@/lib/use-translation"
import { KpiCard } from "@/components/kpi/KpiCard"
import { SourcesChart } from "@/components/charts/SourcesChart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getLeadsBySource, getConversionRate } from "@/lib/calculations"

export default function MarketingPage() {
  const deals = useCrmStore((s) => s.deals)
  const { t } = useTranslation()

  const sourceData = getLeadsBySource(deals)
  const conversionRate = getConversionRate(deals)
  const totalLeads = deals.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("marketing.title")}</h1>
        <p className="text-muted-foreground">{t("marketing.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label={t("marketing.kpi.totalLeads")} value={String(totalLeads)} />
        <KpiCard label={t("marketing.kpi.conversionRate")} value={`${(conversionRate * 100).toFixed(1)}%`} />
        <KpiCard label={t("marketing.kpi.activeSources")} value={String(sourceData.length)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("marketing.chart.bySource")}</CardTitle>
        </CardHeader>
        <CardContent>
          <SourcesChart data={sourceData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("marketing.chart.detail")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {sourceData.map((row) => (
              <div key={row.source} className="flex items-center justify-between py-3">
                <p className="font-medium text-foreground">{row.source || t("marketing.noSource")}</p>
                <div className="flex items-center gap-4">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, (row.count / (sourceData[0]?.count || 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-semibold text-foreground">{row.count}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
