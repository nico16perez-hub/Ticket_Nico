"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useData } from "@/lib/data-context"
import { isAdmin } from "@/lib/auth"
import * as api from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, RefreshCw, AlertTriangle, Wrench, Eye, FileDown } from "lucide-react"
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
} from "date-fns"
import { es } from "date-fns/locale"
import { parseDisplayDate } from "@/lib/date-utils"
import type { CountEntry, ReportEntry, ReportPeriod, StatisticsSummary } from "@/lib/types"
import { cn } from "@/lib/utils"

const TYPE_CONFIG = {
  recurrente: {
    label: "Recurrente",
    className: "bg-chart-1/15 text-chart-1 border-chart-1/30",
    icon: RefreshCw,
  },
  reclamo: {
    label: "Reclamo",
    className: "bg-destructive/15 text-destructive border-destructive/30",
    icon: AlertTriangle,
  },
  trabajo: {
    label: "Trabajo",
    className: "bg-chart-2/15 text-chart-2 border-chart-2/30",
    icon: Wrench,
  },
} as const

const ALL_FILTER_VALUE = "todos"

type ReportTask = {
  id: string | number
  type: "recurrente" | "reclamo" | "trabajo"
  date: string
  userName: string
  title: string
  area?: string
  description: string
  solution?: string | null
}

type TaskTypeFilter = ReportTask["type"] | typeof ALL_FILTER_VALUE

type ChartEntry = {
  label: string
  count: number
  className?: string
}

function getDateRange(period: ReportPeriod): { startDate: string; endDate: string } {
  const now = new Date()

  switch (period) {
    case "today": {
      const day = format(now, "yyyy-MM-dd")
      return { startDate: day, endDate: day }
    }
    case "week":
      return {
        startDate: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        endDate: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      }
    case "month":
      return {
        startDate: format(startOfMonth(now), "yyyy-MM-dd"),
        endDate: format(endOfMonth(now), "yyyy-MM-dd"),
      }
  }
}

function matchesPeriod(dateValue: string, period: ReportPeriod, now: Date) {
  const taskDate = parseISO(dateValue)

  switch (period) {
    case "today":
      return format(taskDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd")
    case "week": {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
      return isWithinInterval(taskDate, { start: weekStart, end: weekEnd })
    }
    case "month": {
      const monthStart = startOfMonth(now)
      const monthEnd = endOfMonth(now)
      return isWithinInterval(taskDate, { start: monthStart, end: monthEnd })
    }
    default:
      return true
  }
}

function normalizeEntry(entry: CountEntry) {
  const label = entry.label ?? entry.name ?? entry.key ?? "Sin etiqueta"
  const count = entry.count ?? entry.total ?? entry.value ?? 0
  return { label, count }
}

function uniqueOptions(values: Array<string | undefined>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter((value): value is string => !!value))
  ).sort((a, b) => a.localeCompare(b, "es"))
}

function isReportTaskType(value: string): value is ReportTask["type"] {
  return value === "recurrente" || value === "reclamo" || value === "trabajo"
}

function mapReportEntry(entry: ReportEntry): ReportTask | null {
  if (!isReportTaskType(entry.type)) return null

  return {
    id: entry.id,
    type: entry.type,
    date: entry.date,
    userName: entry.userName,
    title: entry.title,
    area: entry.area,
    description: entry.description,
    solution: entry.solution,
  }
}

function getTypeChart(tasks: ReportTask[]): ChartEntry[] {
  return (["recurrente", "reclamo", "trabajo"] as const).map((type) => ({
    label: TYPE_CONFIG[type].label,
    count: tasks.filter((task) => task.type === type).length,
    className:
      type === "recurrente"
        ? "bg-chart-1"
        : type === "reclamo"
          ? "bg-destructive"
          : "bg-chart-2",
  }))
}

function getAreaChart(tasks: ReportTask[]): ChartEntry[] {
  const counts = tasks.reduce<Record<string, number>>((acc, task) => {
    const area = task.area?.trim() || "Sin area"
    acc[area] = (acc[area] ?? 0) + 1
    return acc
  }, {})

  return Object.entries(counts)
    .map(([label, count]) => ({ label, count, className: "bg-primary" }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es"))
    .slice(0, 6)
}

function StatsList({ title, entries }: { title: string; entries: CountEntry[] }) {
  return (
    <Card className="border-border/50 pdf-avoid-break">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-card-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos</p>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((entry, index) => {
              const item = normalizeEntry(entry)
              return (
                <div
                  key={`${item.label}-${index}`}
                  className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2"
                >
                  <span className="text-sm text-card-foreground truncate pr-3">{item.label}</span>
                  <Badge variant="secondary" className="text-sm">
                    {item.count}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ReportChart({ title, entries }: { title: string; entries: ChartEntry[] }) {
  const max = Math.max(...entries.map((entry) => entry.count), 0)
  const visibleEntries = entries.filter((entry) => entry.count > 0)

  return (
    <Card className="border-border/50 pdf-avoid-break">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-card-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {visibleEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos para graficar</p>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleEntries.map((entry) => (
              <div key={entry.label} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-card-foreground">{entry.label}</span>
                  <span className="font-medium text-muted-foreground">{entry.count}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", entry.className ?? "bg-primary")}
                    style={{ width: `${Math.max((entry.count / max) * 100, 8)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ReportsView() {
  const { user } = useAuth()
  const { dailyTasks, claims, completedWorks } = useData()
  const router = useRouter()
  const [period, setPeriod] = useState<ReportPeriod>("today")
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<TaskTypeFilter>(ALL_FILTER_VALUE)
  const [areaFilter, setAreaFilter] = useState(ALL_FILTER_VALUE)
  const [userFilter, setUserFilter] = useState(ALL_FILTER_VALUE)
  const [reportTasks, setReportTasks] = useState<ReportTask[]>([])
  const [loadingReport, setLoadingReport] = useState(false)
  const [statistics, setStatistics] = useState<StatisticsSummary | null>(null)
  const [loadingStatistics, setLoadingStatistics] = useState(false)
  const isAdminUser = isAdmin(user)

  const { startDate, endDate } = useMemo(() => getDateRange(period), [period])
  const fallbackPeriodTasks = useMemo(() => {
    const now = new Date()
    const allTasks: ReportTask[] = [
      ...dailyTasks.filter((task) => task.type === "recurrente"),
      ...claims.map((claim) => ({
        id: claim.id,
        type: "reclamo" as const,
        date: claim.date,
        userName: claim.userName,
        title: claim.title,
        area: claim.area,
        description: claim.description,
        solution: claim.solution,
      })),
      ...completedWorks.map((work) => ({
        id: work.id,
        type: "trabajo" as const,
        date: work.date,
        userName: work.userName,
        title: work.title,
        area: work.area,
        description: work.description,
        solution: work.solution,
      })),
    ]

    return allTasks.filter((task) => matchesPeriod(task.date, period, now))
  }, [claims, completedWorks, dailyTasks, period])

  const periodTasks = reportTasks.length > 0 ? reportTasks : fallbackPeriodTasks

  const periodClaims = useMemo(() => {
    const now = new Date()
    return claims.filter((claim) => matchesPeriod(claim.date, period, now))
  }, [claims, period])

  const areaOptions = useMemo(() => uniqueOptions(periodTasks.map((task) => task.area)), [periodTasks])
  const userOptions = useMemo(() => uniqueOptions(periodTasks.map((task) => task.userName)), [periodTasks])

  const filteredTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return periodTasks.filter((task) => {
      if (typeFilter !== ALL_FILTER_VALUE && task.type !== typeFilter) return false
      if (areaFilter !== ALL_FILTER_VALUE && (task.area?.trim() || "Sin area") !== areaFilter) return false
      if (userFilter !== ALL_FILTER_VALUE && task.userName !== userFilter) return false
      if (!normalizedSearch) return true

      return [
        task.title,
        task.description,
        task.area,
        task.userName,
        task.solution,
        TYPE_CONFIG[task.type].label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    })
  }, [areaFilter, periodTasks, search, typeFilter, userFilter])

  const typeFilterBaseTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return periodTasks.filter((task) => {
      if (areaFilter !== ALL_FILTER_VALUE && (task.area?.trim() || "Sin area") !== areaFilter) return false
      if (userFilter !== ALL_FILTER_VALUE && task.userName !== userFilter) return false
      if (!normalizedSearch) return true

      return [
        task.title,
        task.description,
        task.area,
        task.userName,
        task.solution,
        TYPE_CONFIG[task.type].label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    })
  }, [areaFilter, periodTasks, search, userFilter])

  useEffect(() => {
    if (!isAdminUser) {
      router.replace("/dashboard")
      return
    }

    let mounted = true

    const loadReportData = async () => {
      setLoadingStatistics(true)
      setLoadingReport(true)
      const [entries, data] = await Promise.all([
        api.getReport(period),
        api.getStatisticsSummary(startDate, endDate),
      ])

      if (mounted) {
        setReportTasks(entries.map(mapReportEntry).filter((task): task is ReportTask => task !== null))
        setStatistics(data)
        setLoadingStatistics(false)
        setLoadingReport(false)
      }
    }

    void loadReportData()

    return () => {
      mounted = false
    }
  }, [endDate, isAdminUser, period, router, startDate])

  useEffect(() => {
    if (areaFilter !== ALL_FILTER_VALUE && !areaOptions.includes(areaFilter)) {
      setAreaFilter(ALL_FILTER_VALUE)
    }

    if (userFilter !== ALL_FILTER_VALUE && !userOptions.includes(userFilter)) {
      setUserFilter(ALL_FILTER_VALUE)
    }
  }, [areaFilter, areaOptions, userFilter, userOptions])

  const typeStats = {
    total: typeFilterBaseTasks.length,
    recurrente: typeFilterBaseTasks.filter((t) => t.type === "recurrente").length,
    reclamo: typeFilterBaseTasks.filter((t) => t.type === "reclamo").length,
    trabajo: typeFilterBaseTasks.filter((t) => t.type === "trabajo").length,
  }

  const displayStatistics = useMemo(() => {
    if (!statistics) return null

    const itemsByRecordType = (["recurrente", "reclamo", "trabajo"] as const).map((type) => ({
      label: TYPE_CONFIG[type].label,
      count: periodTasks.filter((task) => task.type === type).length,
    }))

    const itemsByArea = getAreaChart(periodTasks).map(({ label, count }) => ({ label, count }))

    const claimsByProblemType = Object.entries(
      periodClaims.reduce<Record<string, number>>((acc, claim) => {
        const problemType = claim.problemType?.trim() || "Sin tipo"
        acc[problemType] = (acc[problemType] ?? 0) + 1
        return acc
      }, {})
    )
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es"))

    const itemsByUser = Object.entries(
      periodTasks.reduce<Record<string, number>>((acc, task) => {
        acc[task.userName] = (acc[task.userName] ?? 0) + 1
        return acc
      }, {})
    )
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es"))

    return {
      ...statistics,
      totalItems: periodTasks.length,
      totalClaims: periodTasks.filter((task) => task.type === "reclamo").length,
      totalCompletedWorks: periodTasks.filter((task) => task.type === "trabajo").length,
      totalRecurringTasks: periodTasks.filter((task) => task.type === "recurrente").length,
      itemsByRecordType,
      itemsByArea,
      claimsByProblemType,
      itemsByUser,
    }
  }, [periodClaims, periodTasks, statistics])
  const chartByType = useMemo(() => getTypeChart(filteredTasks), [filteredTasks])
  const chartByArea = useMemo(() => getAreaChart(filteredTasks), [filteredTasks])
  const hasActiveFilters =
    search.trim() ||
    typeFilter !== ALL_FILTER_VALUE ||
    areaFilter !== ALL_FILTER_VALUE ||
    userFilter !== ALL_FILTER_VALUE

  const clearFilters = () => {
    setSearch("")
    setTypeFilter(ALL_FILTER_VALUE)
    setAreaFilter(ALL_FILTER_VALUE)
    setUserFilter(ALL_FILTER_VALUE)
  }

  if (!isAdminUser) {
    return null
  }

  const handleExportPdf = () => {
    window.print()
  }

  return (
    <>
      <div id="reports-pdf" className="reports-pdf flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Informes
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            Vista general de todas las tareas registradas por el equipo.
          </p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-3">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
            <TabsList>
              <TabsTrigger value="today" className="text-base">Hoy</TabsTrigger>
              <TabsTrigger value="week" className="text-base">Esta semana</TabsTrigger>
              <TabsTrigger value="month" className="text-base">Este mes</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button onClick={handleExportPdf} className="ml-auto">
            <FileDown className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>

        <Card className="no-print border-border/50">
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_180px_180px_auto]">
              <div className="relative">
                <BarChart3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por titulo, descripcion, area o usuario"
                  className="pl-9 text-base"
                />
              </div>

              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TaskTypeFilter)}>
                <SelectTrigger className="w-full text-base">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>Todos los tipos</SelectItem>
                  <SelectItem value="recurrente">Recurrentes</SelectItem>
                  <SelectItem value="reclamo">Reclamos</SelectItem>
                  <SelectItem value="trabajo">Trabajos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger className="w-full text-base">
                  <SelectValue placeholder="Area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>Todas las areas</SelectItem>
                  {areaOptions.map((area) => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-full text-base">
                  <SelectValue placeholder="Usuario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>Todos los usuarios</SelectItem>
                  {userOptions.map((userName) => (
                    <SelectItem key={userName} value={userName}>{userName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="w-full xl:w-auto"
              >
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-4">
          <Card
            role="button"
            tabIndex={0}
            onClick={() => setTypeFilter(ALL_FILTER_VALUE)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                setTypeFilter(ALL_FILTER_VALUE)
              }
            }}
            className={cn(
              "cursor-pointer border-border/50 transition-colors hover:border-primary/50 hover:bg-muted/30 pdf-avoid-break",
              typeFilter === ALL_FILTER_VALUE && "border-primary/60 bg-primary/5"
            )}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <BarChart3 className={cn(
                "h-5 w-5",
                typeFilter === ALL_FILTER_VALUE ? "text-primary" : "text-muted-foreground"
              )} />
              <div>
                <p className="text-2xl font-semibold text-card-foreground">{typeStats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          {(["recurrente", "reclamo", "trabajo"] as const).map((type) => {
            const config = TYPE_CONFIG[type]
            const active = typeFilter === type
            return (
              <Card
                key={type}
                role="button"
                tabIndex={0}
                onClick={() => setTypeFilter(type)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    setTypeFilter(type)
                  }
                }}
                className={cn(
                  "cursor-pointer border-border/50 transition-colors hover:border-primary/50 hover:bg-muted/30 pdf-avoid-break",
                  active && "border-primary/60 bg-primary/5"
                )}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <config.icon className={`h-5 w-5 ${type === "recurrente" ? "text-chart-1" :
                      type === "reclamo" ? "text-destructive" :
                        "text-chart-2"
                    }`} />
                  <div>
                    <p className="text-2xl font-semibold text-card-foreground">{typeStats[type]}</p>
                    <p className="text-sm text-muted-foreground">{config.label}s</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card className="border-border/50 pdf-avoid-break">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-card-foreground">
              Estadisticas del periodo ({startDate} a {endDate})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStatistics ? (
              <p className="text-base text-muted-foreground">Cargando estadisticas...</p>
            ) : !displayStatistics ? (
              <p className="text-base text-muted-foreground">No se pudieron cargar las estadisticas.</p>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card className="pdf-avoid-break">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Total items</p>
                      <p className="text-2xl font-semibold">{displayStatistics.totalItems ?? 0}</p>
                    </CardContent>
                  </Card>
                  <Card className="pdf-avoid-break">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Total reclamos</p>
                      <p className="text-2xl font-semibold">{displayStatistics.totalClaims ?? 0}</p>
                    </CardContent>
                  </Card>
                  <Card className="pdf-avoid-break">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Total trabajos</p>
                      <p className="text-2xl font-semibold">{displayStatistics.totalCompletedWorks ?? 0}</p>
                    </CardContent>
                  </Card>
                  <Card className="pdf-avoid-break">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Total recurrentes</p>
                      <p className="text-2xl font-semibold">{displayStatistics.totalRecurringTasks ?? 0}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <StatsList title="Items por tipo" entries={displayStatistics.itemsByRecordType ?? []} />
                  <StatsList title="Items por area" entries={displayStatistics.itemsByArea ?? []} />
                  <StatsList title="Reclamos por tipo de problema" entries={displayStatistics.claimsByProblemType ?? []} />
                  <StatsList title="Items por usuario" entries={displayStatistics.itemsByUser ?? []} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <ReportChart title="Distribucion por tipo" entries={chartByType} />
          <ReportChart title="Areas con mas actividad" entries={chartByArea} />
        </div>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-card-foreground">Detalle de tareas</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-base text-muted-foreground">
                  No hay tareas para el periodo seleccionado
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-base">Fecha</TableHead>
                    <TableHead className="text-base">Usuario</TableHead>
                    <TableHead className="text-base">Tipo</TableHead>
                    <TableHead className="text-base">Titulo</TableHead>
                    <TableHead className="text-base">Area</TableHead>
                    <TableHead className="text-base">Descripcion</TableHead>
                    <TableHead className="text-base">Solucion</TableHead>
                    <TableHead className="text-base text-right pdf-detail-col no-print">Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => {
                    const config = TYPE_CONFIG[task.type]
                    return (
                      <TableRow key={`${task.type}-${task.id}`}>
                        <TableCell className="text-muted-foreground text-base">
                          {format(parseISO(task.date), "dd/MM", { locale: es })}
                        </TableCell>
                        <TableCell className="text-base">{task.userName}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${config.className}`}
                          >
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-base">{task.title}</TableCell>
                        <TableCell className="text-muted-foreground text-base">{task.area ?? "-"}</TableCell>
                        <TableCell className="text-muted-foreground text-base pdf-description">
                          {task.description}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-base pdf-description">
                          {task.solution?.trim() ? task.solution : "-"}
                        </TableCell>
                        <TableCell className="text-right pdf-detail-col no-print">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">Ver detalle</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                              <DialogHeader>
                                <DialogTitle className="text-xl">{task.title}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-3 text-base">
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                                  <p>{config.label}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Fecha</p>
                                  <p>{format(parseDisplayDate(task.date), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Usuario</p>
                                  <p>{task.userName}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Area</p>
                                  <p>{task.area ?? "-"}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Descripcion</p>
                                  <p className="whitespace-pre-wrap">{task.description || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Solucion</p>
                                  <p className="whitespace-pre-wrap">{task.solution?.trim() || "-"}</p>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }

          #reports-pdf,
          #reports-pdf * {
            visibility: visible;
          }

          #reports-pdf {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 16px;
            background: #fff;
            color: #000;
            font-size: 12px;
          }

          .no-print {
            display: none !important;
          }

          .pdf-detail-col {
            display: none !important;
          }

          .pdf-description {
            white-space: normal !important;
            overflow: visible !important;
            max-width: none !important;
            line-height: 1.35 !important;
          }

          .pdf-avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 11px !important;
          }

          th,
          td {
            border: 1px solid #d4d4d8 !important;
            padding: 6px !important;
            vertical-align: top !important;
          }

          @page {
            size: A4;
            margin: 12mm;
          }
        }
      `}</style>
    </>
  )
}
