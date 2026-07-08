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
import type { CountEntry, ReportPeriod, StatisticsSummary } from "@/lib/types"

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

type ReportTask = {
  id: string | number
  type: "recurrente" | "reclamo" | "trabajo"
  date: string
  userName: string
  title: string
  area?: string
  description: string
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

function normalizeEntry(entry: CountEntry) {
  const label = entry.label ?? entry.name ?? entry.key ?? "Sin etiqueta"
  const count = entry.count ?? entry.total ?? entry.value ?? 0
  return { label, count }
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

export function ReportsView() {
  const { user } = useAuth()
  const { dailyTasks, claims, completedWorks } = useData()
  const router = useRouter()
  const [period, setPeriod] = useState<ReportPeriod>("today")
  const [statistics, setStatistics] = useState<StatisticsSummary | null>(null)
  const [loadingStatistics, setLoadingStatistics] = useState(false)
  const isAdminUser = isAdmin(user)

  const { startDate, endDate } = useMemo(() => getDateRange(period), [period])
  const filteredTasks = useMemo(() => {
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
      })),
      ...completedWorks.map((work) => ({
        id: work.id,
        type: "trabajo" as const,
        date: work.date,
        userName: work.userName,
        title: work.title,
        area: work.area,
        description: work.description,
      })),
    ]

    return allTasks.filter((task) => {
      const taskDate = parseISO(task.date)
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
    })
  }, [dailyTasks, claims, completedWorks, period])

  useEffect(() => {
    if (!isAdminUser) {
      router.replace("/dashboard")
      return
    }

    let mounted = true

    const loadStatistics = async () => {
      setLoadingStatistics(true)
      const data = await api.getStatisticsSummary(startDate, endDate)
      if (mounted) {
        setStatistics(data)
        setLoadingStatistics(false)
      }
    }

    void loadStatistics()

    return () => {
      mounted = false
    }
  }, [endDate, isAdminUser, router, startDate])

  const stats = {
    total: filteredTasks.length,
    recurrente: filteredTasks.filter((t) => t.type === "recurrente").length,
    reclamo: filteredTasks.filter((t) => t.type === "reclamo").length,
    trabajo: filteredTasks.filter((t) => t.type === "trabajo").length,
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

        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="border-border/50 pdf-avoid-break">
            <CardContent className="flex items-center gap-3 p-4">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-semibold text-card-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          {(["recurrente", "reclamo", "trabajo"] as const).map((type) => {
            const config = TYPE_CONFIG[type]
            return (
              <Card key={type} className="border-border/50 pdf-avoid-break">
                <CardContent className="flex items-center gap-3 p-4">
                  <config.icon className={`h-5 w-5 ${type === "recurrente" ? "text-chart-1" :
                      type === "reclamo" ? "text-destructive" :
                        "text-chart-2"
                    }`} />
                  <div>
                    <p className="text-2xl font-semibold text-card-foreground">{stats[type]}</p>
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
            ) : !statistics ? (
              <p className="text-base text-muted-foreground">No se pudieron cargar las estadisticas.</p>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card className="pdf-avoid-break">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Total items</p>
                      <p className="text-2xl font-semibold">{statistics.totalItems ?? 0}</p>
                    </CardContent>
                  </Card>
                  <Card className="pdf-avoid-break">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Total reclamos</p>
                      <p className="text-2xl font-semibold">{statistics.totalClaims ?? 0}</p>
                    </CardContent>
                  </Card>
                  <Card className="pdf-avoid-break">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Total trabajos</p>
                      <p className="text-2xl font-semibold">{statistics.totalCompletedWorks ?? 0}</p>
                    </CardContent>
                  </Card>
                  <Card className="pdf-avoid-break">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Total recurrentes</p>
                      <p className="text-2xl font-semibold">{statistics.totalRecurringTasks ?? 0}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <StatsList title="Items por tipo" entries={statistics.itemsByRecordType ?? []} />
                  <StatsList title="Items por area" entries={statistics.itemsByArea ?? []} />
                  <StatsList title="Reclamos por tipo de problema" entries={statistics.claimsByProblemType ?? []} />
                  <StatsList title="Items por usuario" entries={statistics.itemsByUser ?? []} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
