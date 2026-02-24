import type { PipelineStage } from "@/types/deal"

export const STAGE_PROBABILITIES: Record<PipelineStage, number> = {
  Lead: 0.1,
  Qualification: 0.2,
  Discovery: 0.4,
  "Proposal Sent": 0.6,
  Negotiation: 0.8,
  "Closed Won": 1.0,
  "Closed Lost": 0.0,
}

export const PIPELINE_STAGES: PipelineStage[] = [
  "Lead",
  "Qualification",
  "Discovery",
  "Proposal Sent",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
]

export const OPEN_STAGES: PipelineStage[] = [
  "Lead",
  "Qualification",
  "Discovery",
  "Proposal Sent",
  "Negotiation",
]

/** Chart color palette for light mode */
export const CHART_COLORS_LIGHT = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
]

/** Chart color palette for dark mode — brighter, higher contrast against dark bg */
export const CHART_COLORS_DARK = [
  "#60a5fa", // blue-400
  "#34d399", // emerald-400
  "#fbbf24", // amber-400
  "#f87171", // red-400
  "#a78bfa", // violet-400
  "#22d3ee", // cyan-400
  "#fb923c", // orange-400
]

/** Axis/grid colors for Recharts */
export const CHART_AXIS_LIGHT = "#6b7280"  // gray-500
export const CHART_AXIS_DARK  = "#9ca3af"  // gray-400
export const CHART_GRID_LIGHT = "#e5e7eb"  // gray-200
export const CHART_GRID_DARK  = "#374151"  // gray-700

export const COLD_DEAL_DAYS = parseInt(process.env.NEXT_PUBLIC_COLD_DEAL_DAYS ?? "14")
export const UNHANDLED_LEAD_HOURS = parseInt(process.env.NEXT_PUBLIC_UNHANDLED_LEAD_HOURS ?? "48")
export const FORECAST_SHORT = parseInt(process.env.NEXT_PUBLIC_FORECAST_SHORT ?? "30")
export const FORECAST_MID = parseInt(process.env.NEXT_PUBLIC_FORECAST_MID ?? "60")
export const FORECAST_LONG = parseInt(process.env.NEXT_PUBLIC_FORECAST_LONG ?? "90")
