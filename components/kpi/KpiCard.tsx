import { Card, CardContent } from "@/components/ui/card"
import { TrendingDown, TrendingUp, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  delta?: number // positive = up, negative = down, 0/undefined = neutral
}

export function KpiCard({ label, value, sub, delta }: KpiCardProps) {
  const DeltaIcon =
    delta === undefined || delta === 0
      ? Minus
      : delta > 0
      ? TrendingUp
      : TrendingDown

  const deltaColor =
    delta === undefined || delta === 0
      ? "text-muted-foreground"
      : delta > 0
      ? "text-emerald-500 dark:text-emerald-400"
      : "text-red-500 dark:text-red-400"

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
        {sub && (
          <p className={cn("mt-1 flex items-center gap-1 text-xs", deltaColor)}>
            <DeltaIcon className="h-3.5 w-3.5" />
            {sub}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
