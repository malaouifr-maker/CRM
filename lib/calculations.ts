import { addDays, differenceInDays, isAfter, isBefore, subDays, subHours } from "date-fns"
import {
  STAGE_PROBABILITIES,
  OPEN_STAGES,
  COLD_DEAL_DAYS,
  UNHANDLED_LEAD_HOURS,
  FORECAST_SHORT,
  FORECAST_MID,
  FORECAST_LONG,
} from "@/lib/constants"
import type { Deal } from "@/types/deal"

export function getOpenDeals(deals: Deal[]): Deal[] {
  return deals.filter((d) => OPEN_STAGES.includes(d.pipelineStage))
}

export function getGrossPipe(deals: Deal[]): number {
  return getOpenDeals(deals).reduce((sum, d) => sum + d.dealValue, 0)
}

export function getWeightedPipe(deals: Deal[]): number {
  return getOpenDeals(deals).reduce(
    (sum, d) => sum + d.dealValue * (STAGE_PROBABILITIES[d.pipelineStage] ?? 0),
    0
  )
}

export function getWonDeals(deals: Deal[]): Deal[] {
  return deals.filter((d) => d.pipelineStage === "Closed Won")
}

export function getLostDeals(deals: Deal[]): Deal[] {
  return deals.filter((d) => d.pipelineStage === "Closed Lost")
}

export function getForecast(deals: Deal[], days: number): number {
  const horizon = addDays(new Date(), days)
  return deals
    .filter(
      (d) =>
        OPEN_STAGES.includes(d.pipelineStage) &&
        isBefore(d.nextFollowupDate, horizon)
    )
    .reduce(
      (sum, d) => sum + d.dealValue * (STAGE_PROBABILITIES[d.pipelineStage] ?? 0),
      0
    )
}

export function getForecastData(deals: Deal[]) {
  return [
    { label: `${FORECAST_SHORT}j`, value: getForecast(deals, FORECAST_SHORT) },
    { label: `${FORECAST_MID}j`, value: getForecast(deals, FORECAST_MID) },
    { label: `${FORECAST_LONG}j`, value: getForecast(deals, FORECAST_LONG) },
  ]
}

export function getColdDeals(deals: Deal[]): Deal[] {
  const threshold = subDays(new Date(), COLD_DEAL_DAYS)
  return deals.filter(
    (d) =>
      d.pipelineStage !== "Closed Won" &&
      d.pipelineStage !== "Closed Lost" &&
      isBefore(d.lastContactDate, threshold)
  )
}

export function getUnhandledLeads(deals: Deal[]): Deal[] {
  const threshold = subHours(new Date(), UNHANDLED_LEAD_HOURS)
  return deals.filter(
    (d) => d.pipelineStage === "Lead" && isBefore(d.createdDate, threshold)
  )
}

export function getQuickWins(deals: Deal[]): Deal[] {
  const allValues = deals.map((d) => d.dealValue).filter((v) => v > 0)
  const median =
    allValues.length > 0
      ? allValues.sort((a, b) => a - b)[Math.floor(allValues.length / 2)]
      : 0
  return deals.filter(
    (d) =>
      (d.pipelineStage === "Negotiation" || d.pipelineStage === "Proposal Sent") &&
      d.dealValue >= median
  )
}

export function getConversionRate(deals: Deal[]): number {
  const closedDeals = deals.filter(
    (d) => d.pipelineStage === "Closed Won" || d.pipelineStage === "Closed Lost"
  )
  if (closedDeals.length === 0) return 0
  return getWonDeals(deals).length / closedDeals.length
}

export function getPipelineByStage(deals: Deal[]) {
  return OPEN_STAGES.map((stage) => {
    const stageDeals = deals.filter((d) => d.pipelineStage === stage)
    return {
      stage,
      count: stageDeals.length,
      value: stageDeals.reduce((s, d) => s + d.dealValue, 0),
    }
  })
}

export function getLeadsBySource(deals: Deal[]) {
  const map = new Map<string, number>()
  deals.forEach((d) => {
    map.set(d.leadSource, (map.get(d.leadSource) ?? 0) + 1)
  })
  return Array.from(map.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value)
}
