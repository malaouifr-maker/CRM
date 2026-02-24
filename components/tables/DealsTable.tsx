"use client"

import { useState, useMemo } from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { ChevronUp, ChevronDown, ChevronsUpDown, Eye, X, Plus, ChevronDown as ChevronDownIcon, Maximize2, Minimize2 } from "lucide-react"
import * as Dialog from "@radix-ui/react-dialog"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/calculations"
import { useTranslation } from "@/lib/use-translation"
import { RentPeriodForm, type Forecast } from "@/components/forms/RentPeriodForm"
import { PIPELINE_STAGES } from "@/lib/constants"
import type { Deal } from "@/types/deal"

const stageColors: Record<string, string> = {
  Lead: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Qualification: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Discovery: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "Proposal Sent": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Negotiation: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "Closed Won": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Closed Lost": "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
}

interface DealsTableProps {
  deals: Deal[]
}

export function DealsTable({ deals }: DealsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [stageFilter, setStageFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [forecast, setForecast] = useState<Forecast>({ monthlyBase: 0, monthlyRentExclVATExclService: 0, yearlyRent: 0 })
  const [dialogExpanded, setDialogExpanded] = useState(false)
  const [createExpanded, setCreateExpanded] = useState(true)
  const { t } = useTranslation()

  const columns: ColumnDef<Deal>[] = [
    {
      accessorFn: (d) => `${d.firstName} ${d.lastName}`,
      id: "name",
      header: t("table.contact"),
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground">{row.original.firstName} {row.original.lastName}</p>
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    { accessorKey: "company", header: t("table.company") },
    {
      accessorKey: "pipelineStage",
      header: t("table.stage"),
      cell: ({ getValue }) => {
        const stage = getValue<string>()
        return (
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${stageColors[stage] ?? ""}`}>
            {stage}
          </span>
        )
      },
    },
    {
      accessorKey: "dealValue",
      header: t("table.value"),
      cell: ({ getValue }) => formatCurrency(getValue<number>()),
    },
    { accessorKey: "owner", header: t("table.owner") },
    {
      accessorKey: "leadSource",
      header: t("table.source"),
      cell: ({ getValue }) => (
        <Badge variant="outline">{getValue<string>()}</Badge>
      ),
    },
    {
      accessorKey: "nextFollowupDate",
      header: t("table.nextFollowup"),
      cell: ({ getValue }) => getValue<Date>().toLocaleDateString("fr-FR"),
    },
    {
      id: "actions",
      header: t("table.action"),
      enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              {t("table.view")}
              <ChevronDownIcon className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              sideOffset={4}
              align="end"
              className="z-[70] min-w-[200px] rounded-md border bg-background shadow-md p-1 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
            >
              <DropdownMenu.Item
                className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none"
                onSelect={() => { setSelectedDeal(row.original); setDialogOpen(true) }}
              >
                <Eye className="h-3.5 w-3.5" />
                {t("form.viewDetail")}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none"
                onSelect={() => setCreateOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("form.createDeal")}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      ),
    },
  ]

  const filtered = useMemo(
    () => (stageFilter === "all" ? deals : deals.filter((d) => d.pipelineStage === stageFilter)),
    [deals, stageFilter]
  )

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder={t("table.search")}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder={t("table.allStages")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("table.allStages")}</SelectItem>
            {PIPELINE_STAGES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} {table.getFilteredRowModel().rows.length !== 1 ? t("common.deals") : t("common.deal")}
        </span>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className="whitespace-nowrap">
                    {h.isPlaceholder ? null : (
                      <button
                        className="flex items-center gap-1 hover:text-foreground"
                        onClick={h.column.getToggleSortingHandler()}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getIsSorted() === "asc" ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : h.column.getIsSorted() === "desc" ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-10 text-center text-muted-foreground">
                  {t("table.noDeals")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {t("table.page")} {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            {t("table.prev")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            {t("table.next")}
          </Button>
        </div>
      </div>

      <Dialog.Root open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setDialogExpanded(false) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className={`fixed inset-y-0 right-0 z-[60] ${dialogExpanded ? "w-[min(90vw,900px)]" : "w-[500px]"} bg-background shadow-2xl flex flex-col transition-[width] ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300`}>
            <div className="flex items-center justify-between border-b px-6 py-4">
              <Dialog.Title className="text-lg font-semibold text-foreground">
                {selectedDeal ? `${selectedDeal.firstName} ${selectedDeal.lastName}` : ""}
              </Dialog.Title>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setDialogExpanded(v => !v)}>
                  {dialogExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Dialog.Close asChild>
                  <Button variant="ghost" size="icon">
                    <X className="h-4 w-4" />
                  </Button>
                </Dialog.Close>
              </div>
            </div>

            {selectedDeal && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Étape */}
                <div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${stageColors[selectedDeal.pipelineStage] ?? ""}`}>
                    {selectedDeal.pipelineStage}
                  </span>
                </div>

                {/* Valeur */}
                <div className="rounded-lg border bg-muted/30 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("panel.dealValue")}</span>
                  <span className="text-xl font-bold text-foreground">{formatCurrency(selectedDeal.dealValue)}</span>
                </div>

                {/* Contact */}
                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("panel.contact")}</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">{t("panel.email")}</dt>
                      <dd className="font-medium text-foreground">{selectedDeal.email}</dd>
                    </div>
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">{t("panel.company")}</dt>
                      <dd className="font-medium text-foreground">{selectedDeal.company}</dd>
                    </div>
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">{t("panel.industry")}</dt>
                      <dd className="font-medium text-foreground">{selectedDeal.industry}</dd>
                    </div>
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">{t("panel.size")}</dt>
                      <dd className="font-medium text-foreground">{selectedDeal.companySize}</dd>
                    </div>
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">{t("panel.country")}</dt>
                      <dd className="font-medium text-foreground">{selectedDeal.country}</dd>
                    </div>
                  </dl>
                </section>

                {/* Commercial */}
                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("panel.sales")}</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">{t("panel.owner")}</dt>
                      <dd className="font-medium text-foreground">{selectedDeal.owner}</dd>
                    </div>
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">{t("panel.source")}</dt>
                      <dd className="font-medium text-foreground">{selectedDeal.leadSource}</dd>
                    </div>
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">{t("panel.status")}</dt>
                      <dd className="font-medium text-foreground">{selectedDeal.status}</dd>
                    </div>
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">{t("panel.createdAt")}</dt>
                      <dd className="font-medium text-foreground">{selectedDeal.createdDate.toLocaleDateString("fr-FR")}</dd>
                    </div>
                  </dl>
                </section>

                {/* Suivi */}
                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("panel.followup")}</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">{t("panel.lastContact")}</dt>
                      <dd className="font-medium text-foreground">{selectedDeal.lastContactDate.toLocaleDateString("fr-FR")}</dd>
                    </div>
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">{t("panel.nextFollowup")}</dt>
                      <dd className="font-medium text-foreground">{selectedDeal.nextFollowupDate.toLocaleDateString("fr-FR")}</dd>
                    </div>
                  </dl>
                </section>

                {/* Tags */}
                {selectedDeal.tags.length > 0 && (
                  <section>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("panel.tags")}</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedDeal.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {/* ── Create Deal Panel ── */}
      <Dialog.Root open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setCreateExpanded(true) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className={`fixed inset-y-0 right-0 z-[60] ${createExpanded ? "w-[min(90vw,900px)]" : "w-[500px]"} bg-background shadow-2xl flex flex-col transition-[width] ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300`}>
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
              <Dialog.Title className="text-lg font-semibold text-foreground">
                {t("form.createDeal")}
              </Dialog.Title>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost" size="icon"
                  title={createExpanded ? "Réduire" : "Agrandir"}
                  onClick={() => setCreateExpanded(v => !v)}
                >
                  {createExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Dialog.Close asChild>
                  <Button variant="ghost" size="icon">
                    <X className="h-4 w-4" />
                  </Button>
                </Dialog.Close>
              </div>
            </div>

            {/* Form body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <RentPeriodForm compact={!createExpanded} onForecastChange={setForecast} />
            </div>

            {/* Forecast strip — always visible above footer */}
            <div className="shrink-0 border-t bg-muted/20 px-6 py-3">
              <div className={`grid gap-3 ${createExpanded ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3"}`}>
                {([
                  { label: t("form.monthlyBase"), value: forecast.monthlyBase },
                  { label: t("form.monthlyRentExclVAT"), value: forecast.monthlyRentExclVATExclService },
                  { label: t("form.yearlyRent"), value: forecast.yearlyRent },
                ] as const).map(({ label, value }) => (
                  <div key={label} className="rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/20">
                    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                    <p className="text-sm font-bold text-red-600 dark:text-red-400">
                      {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t px-6 py-4 flex justify-end gap-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
              <Dialog.Close asChild>
                <Button variant="outline">{t("form.cancel")}</Button>
              </Dialog.Close>
              <Button>{t("form.save")}</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
