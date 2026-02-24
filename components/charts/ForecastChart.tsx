"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { useTheme } from "next-themes"
import { useTranslation } from "@/lib/use-translation"
import {
  CHART_COLORS_LIGHT,
  CHART_COLORS_DARK,
  CHART_AXIS_LIGHT,
  CHART_AXIS_DARK,
  CHART_GRID_LIGHT,
  CHART_GRID_DARK,
} from "@/lib/constants"
import { formatCurrency } from "@/lib/calculations"

interface ForecastChartProps {
  data: { label: string; value: number }[]
}

export function ForecastChart({ data }: ForecastChartProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const isDark = theme === "dark"
  const primaryColor = isDark ? CHART_COLORS_DARK[0] : CHART_COLORS_LIGHT[0]
  const axisColor = isDark ? CHART_AXIS_DARK : CHART_AXIS_LIGHT
  const gridColor = isDark ? CHART_GRID_DARK : CHART_GRID_LIGHT

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: axisColor, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => formatCurrency(v)}
          tick={{ fill: axisColor, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={90}
        />
        <Tooltip
          formatter={(value: number) => [formatCurrency(value), t("chart.forecastWeighted")]}
          contentStyle={{
            backgroundColor: isDark ? "hsl(222.2 47.4% 8%)" : "hsl(0 0% 100%)",
            border: "1px solid " + gridColor,
            borderRadius: "6px",
            color: isDark ? "hsl(210 40% 98%)" : "hsl(222.2 84% 4.9%)",
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={primaryColor}
          strokeWidth={2}
          fill="url(#forecastGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
