"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
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

interface SourcesChartProps {
  data: { source: string; count: number }[]
}

export function SourcesChart({ data }: SourcesChartProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const isDark = theme === "dark"
  const colors = isDark ? CHART_COLORS_DARK : CHART_COLORS_LIGHT
  const axisColor = isDark ? CHART_AXIS_DARK : CHART_AXIS_LIGHT
  const gridColor = isDark ? CHART_GRID_DARK : CHART_GRID_LIGHT

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: axisColor, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          dataKey="source"
          type="category"
          tick={{ fill: axisColor, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={90}
        />
        <Tooltip
          formatter={(value: number) => [value, t("chart.leads")]}
          contentStyle={{
            backgroundColor: isDark ? "hsl(222.2 47.4% 8%)" : "hsl(0 0% 100%)",
            border: "1px solid " + gridColor,
            borderRadius: "6px",
            color: isDark ? "hsl(210 40% 98%)" : "hsl(222.2 84% 4.9%)",
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
