"use client"

import { useState, useCallback } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTranslation } from "@/lib/use-translation"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface RentPeriod {
  id: string
  from: string
  to: string
  onward: boolean
  pricingMode: "by_m2" | "fixed"
  // by_m2
  baseRentPerM2: number
  storageRentPerM2: number
  serviceChargePerM2: number
  heatingChargePerM2: number
  // fixed
  fixedMonthlyBase: number
  fixedMonthlyStorage: number
  fixedMonthlyService: number
  fixedMonthlyHeating: number
  // Turnover
  turnoverPercent: number
  minMonthlyTurnover: number
  maxMonthlyTurnover: number
  advanceMonthlyTurnover: number
  // Incentives
  freeRentMonths: number
  otherTaxesPercent: number
  indexationRentPercent: number
  indexationChargesPercent: number
}

function createEmptyPeriod(): RentPeriod {
  return {
    id: Math.random().toString(36).slice(2),
    from: "", to: "", onward: false,
    pricingMode: "by_m2",
    baseRentPerM2: 0, storageRentPerM2: 0, serviceChargePerM2: 0, heatingChargePerM2: 0,
    fixedMonthlyBase: 0, fixedMonthlyStorage: 0, fixedMonthlyService: 0, fixedMonthlyHeating: 0,
    turnoverPercent: 0, minMonthlyTurnover: 0, maxMonthlyTurnover: 0, advanceMonthlyTurnover: 0,
    freeRentMonths: 0, otherTaxesPercent: 0, indexationRentPercent: 0, indexationChargesPercent: 0,
  }
}

// ─── Derived Calculations ─────────────────────────────────────────────────────

function computeForecast(p: RentPeriod, unitArea: number) {
  if (p.pricingMode === "by_m2") {
    const monthlyBase = (p.baseRentPerM2 + p.storageRentPerM2 + p.heatingChargePerM2) * unitArea
    const monthlyRentExclVATExclService = monthlyBase
    return { monthlyBase, monthlyRentExclVATExclService, yearlyRent: monthlyRentExclVATExclService * 12 }
  }
  const monthlyBase = p.fixedMonthlyBase + p.fixedMonthlyStorage + p.fixedMonthlyHeating
  const monthlyRentExclVATExclService = monthlyBase
  return { monthlyBase, monthlyRentExclVATExclService, yearlyRent: monthlyRentExclVATExclService * 12 }
}

const fmt = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v)

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-full mt-5 first:mt-0">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5">
        {children}
      </h4>
    </div>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
      {children}{required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  )
}

function NumericField({
  label, value, onChange, suffix = "EUR", disabled = false, required = false,
}: {
  label: string; value: number; onChange: (v: number) => void
  suffix?: string; disabled?: boolean; required?: boolean
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="flex">
        <Input
          type="number"
          min={0}
          step="any"
          value={value || ""}
          placeholder="0"
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={cn(
            "text-right rounded-r-none border-r-0 flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            disabled && "opacity-50 cursor-not-allowed bg-muted"
          )}
        />
        <span className={cn(
          "inline-flex items-center px-2 h-9 text-xs whitespace-nowrap rounded-r-md border border-l-0 bg-muted text-muted-foreground select-none",
          disabled && "opacity-50"
        )}>
          {suffix}
        </span>
      </div>
    </div>
  )
}

function ForecastCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900 dark:bg-red-950/20">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-base font-bold text-red-600 dark:text-red-400">{fmt(value)}</p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface RentPeriodFormProps {
  unitArea: number
  compact?: boolean
}

export function RentPeriodForm({ unitArea, compact = false }: RentPeriodFormProps) {
  const [periods, setPeriods] = useState<RentPeriod[]>([createEmptyPeriod()])
  const { t } = useTranslation()

  const update = useCallback((id: string, patch: Partial<RentPeriod>) =>
    setPeriods((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))), [])

  const addPeriod = () => setPeriods((prev) => [...prev, createEmptyPeriod()])
  const removePeriod = (id: string) => setPeriods((prev) => prev.filter((p) => p.id !== id))

  return (
    <div className="space-y-5">
      {periods.map((p, idx) => {
        const fc = computeForecast(p, unitArea)
        const isM2 = p.pricingMode === "by_m2"
        const minMaxError = p.maxMonthlyTurnover > 0 && p.minMonthlyTurnover > p.maxMonthlyTurnover

        return (
          <div key={p.id} className="rounded-lg border bg-card shadow-sm">
            {/* Period header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-semibold text-foreground">
                {t("form.rentPeriod")} {idx + 1}
              </span>
              {periods.length > 1 && (
                <Button
                  variant="ghost" size="sm"
                  onClick={() => removePeriod(p.id)}
                  className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  {t("form.removePeriod")}
                </Button>
              )}
            </div>

            <div className={`p-4 grid gap-x-4 gap-y-3 ${compact ? "grid-cols-2" : "grid-cols-4"}`}>

              {/* ── A. Period Configuration ── */}
              <SectionHeader>{t("form.periodConfig")}</SectionHeader>

              <div>
                <FieldLabel required>{t("form.from")}</FieldLabel>
                <Input
                  type="date" value={p.from}
                  onChange={(e) => update(p.id, { from: e.target.value })}
                  className={cn(!p.from && "border-destructive/60")}
                />
              </div>

              <div>
                <FieldLabel>{t("form.to")}</FieldLabel>
                <Input
                  type="date" value={p.to}
                  disabled={p.onward}
                  onChange={(e) => update(p.id, { to: e.target.value })}
                  className={cn(p.onward && "opacity-50 bg-muted cursor-not-allowed")}
                />
              </div>

              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox" checked={p.onward}
                    onChange={(e) => update(p.id, { onward: e.target.checked, to: e.target.checked ? "" : p.to })}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm text-foreground">{t("form.onward")}</span>
                </label>
              </div>

              {/* ── B. Pricing Mode ── */}
              <SectionHeader>{t("form.pricingMode")}</SectionHeader>

              <div className="col-span-full flex gap-6">
                {(["by_m2", "fixed"] as const).map((mode) => (
                  <label key={mode} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio" name={`pricing-${p.id}`}
                      checked={p.pricingMode === mode}
                      onChange={() => update(p.id, { pricingMode: mode })}
                      className="accent-primary"
                    />
                    <span className="text-sm">{t(mode === "by_m2" ? "form.byM2" : "form.fixed")}</span>
                  </label>
                ))}
              </div>

              {/* ── C. Rent Components ── */}
              <SectionHeader>{t("form.rentComponents")}</SectionHeader>

              {isM2 ? (
                <>
                  <NumericField label={t("form.baseRentPerM2")} suffix="EUR/m²"
                    value={p.baseRentPerM2} onChange={(v) => update(p.id, { baseRentPerM2: v })} />
                  <NumericField label={t("form.storageRentPerM2")} suffix="EUR/m²"
                    value={p.storageRentPerM2} onChange={(v) => update(p.id, { storageRentPerM2: v })} />
                  <NumericField label={t("form.serviceChargePerM2")} suffix="EUR/m²"
                    value={p.serviceChargePerM2} onChange={(v) => update(p.id, { serviceChargePerM2: v })} />
                  <NumericField label={t("form.heatingChargePerM2")} suffix="EUR/m²"
                    value={p.heatingChargePerM2} onChange={(v) => update(p.id, { heatingChargePerM2: v })} />
                </>
              ) : (
                <>
                  <NumericField label={t("form.fixedMonthlyBase")}
                    value={p.fixedMonthlyBase} onChange={(v) => update(p.id, { fixedMonthlyBase: v })} />
                  <NumericField label={t("form.fixedMonthlyStorage")}
                    value={p.fixedMonthlyStorage} onChange={(v) => update(p.id, { fixedMonthlyStorage: v })} />
                  <NumericField label={t("form.fixedMonthlyService")}
                    value={p.fixedMonthlyService} onChange={(v) => update(p.id, { fixedMonthlyService: v })} />
                  <NumericField label={t("form.fixedMonthlyHeating")}
                    value={p.fixedMonthlyHeating} onChange={(v) => update(p.id, { fixedMonthlyHeating: v })} />
                </>
              )}

              {/* ── D. Turnover Rent ── */}
              <SectionHeader>{t("form.turnoverRent")}</SectionHeader>

              <NumericField label={t("form.turnoverPercent")} suffix="%"
                value={p.turnoverPercent} onChange={(v) => update(p.id, { turnoverPercent: v })} />
              <NumericField label={t("form.minMonthlyTurnover")}
                value={p.minMonthlyTurnover} onChange={(v) => update(p.id, { minMonthlyTurnover: v })} />
              <NumericField label={t("form.maxMonthlyTurnover")}
                value={p.maxMonthlyTurnover} onChange={(v) => update(p.id, { maxMonthlyTurnover: v })} />
              <NumericField label={t("form.advanceMonthlyTurnover")}
                value={p.advanceMonthlyTurnover} onChange={(v) => update(p.id, { advanceMonthlyTurnover: v })} />

              {minMaxError && (
                <p className="col-span-full text-xs text-destructive">{t("form.minMaxError")}</p>
              )}

              {/* ── E. Incentives ── */}
              <SectionHeader>{t("form.incentives")}</SectionHeader>

              <div>
                <FieldLabel>{t("form.freeRentMonths")}</FieldLabel>
                <select
                  value={p.freeRentMonths}
                  onChange={(e) => update(p.id, { freeRentMonths: parseInt(e.target.value) })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {Array.from({ length: 25 }, (_, i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>

              <NumericField label={t("form.otherTaxesPercent")} suffix="%"
                value={p.otherTaxesPercent} onChange={(v) => update(p.id, { otherTaxesPercent: v })} />
              <NumericField label={t("form.indexationRentPercent")} suffix="%"
                value={p.indexationRentPercent} onChange={(v) => update(p.id, { indexationRentPercent: v })} />
              <NumericField label={t("form.indexationChargesPercent")} suffix="%"
                value={p.indexationChargesPercent} onChange={(v) => update(p.id, { indexationChargesPercent: v })} />

              {/* ── Forecast ── */}
              <SectionHeader>{t("form.forecast")}</SectionHeader>

              <ForecastCard label={t("form.monthlyBase")} value={fc.monthlyBase} />
              <ForecastCard label={t("form.monthlyRentExclVAT")} value={fc.monthlyRentExclVATExclService} />
              <ForecastCard label={t("form.yearlyRent")} value={fc.yearlyRent} />
              <div /> {/* spacer */}

            </div>
          </div>
        )
      })}

      <Button variant="outline" onClick={addPeriod} className="w-full border-dashed text-muted-foreground hover:text-foreground">
        <Plus className="h-4 w-4 mr-2" />
        {t("form.addPeriod")}
      </Button>
    </div>
  )
}
