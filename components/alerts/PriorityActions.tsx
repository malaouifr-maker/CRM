"use client"

import { AlertTriangle, Clock, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getColdDeals, getUnhandledLeads, getQuickWins, formatCurrency } from "@/lib/calculations"
import { useTranslation } from "@/lib/use-translation"
import type { Deal } from "@/types/deal"

interface PriorityActionsProps {
  deals: Deal[]
}

function DealRow({ deal }: { deal: Deal }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-foreground">
          {deal.firstName} {deal.lastName} — {deal.company}
        </p>
        <p className="text-xs text-muted-foreground">{deal.pipelineStage}</p>
      </div>
      <span className="text-sm font-semibold text-foreground">
        {formatCurrency(deal.dealValue)}
      </span>
    </div>
  )
}

export function PriorityActions({ deals }: PriorityActionsProps) {
  const coldDeals = getColdDeals(deals).slice(0, 3)
  const unhandledLeads = getUnhandledLeads(deals).slice(0, 3)
  const quickWins = getQuickWins(deals).slice(0, 3)
  const { t } = useTranslation()

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-amber-500 dark:text-amber-400" />
            {t("priority.coldDeals")}
            <Badge variant="secondary">{coldDeals.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {coldDeals.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("priority.noColdDeal")}</p>
          ) : (
            <div className="divide-y divide-border">
              {coldDeals.map((d) => <DealRow key={d.id} deal={d} />)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
            {t("priority.unhandledLeads")}
            <Badge variant="destructive">{unhandledLeads.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unhandledLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("priority.noUnhandledLead")}</p>
          ) : (
            <div className="divide-y divide-border">
              {unhandledLeads.map((d) => <DealRow key={d.id} deal={d} />)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
            {t("priority.quickWins")}
            <Badge variant="default">{quickWins.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {quickWins.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("priority.noQuickWin")}</p>
          ) : (
            <div className="divide-y divide-border">
              {quickWins.map((d) => <DealRow key={d.id} deal={d} />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
