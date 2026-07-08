"use client"

import { useData } from "@/lib/data-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Check, X } from "lucide-react"
import { toast } from "sonner"

export function RecurringTaskList() {
  const {
    recurringTasks,
    removeRecurringTask,
    acceptRecurringTask,
    isRecurringTaskAccepted,
    isRecurringTaskHidden,
  } = useData()

  async function handleAcceptanceToggle(task: (typeof recurringTasks)[number]) {
    if (isRecurringTaskAccepted(task.id)) {
      const removed = await removeRecurringTask(task.id)
      if (removed) {
        toast.success(`"${task.title}" desaceptada para tu usuario`)
      }
      return
    }

    const accepted = await acceptRecurringTask(task)
    if (accepted) {
      toast.success(`"${task.title}" aceptada para tu usuario`)
    }
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-card-foreground">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
          Tareas recurrentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recurringTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <RefreshCw className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              No hay tareas recurrentes cargadas en el sistema
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Crea una desde el formulario de arriba para que todos puedan aceptarla
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recurringTasks.map((task) => {
              const isAccepted = isRecurringTaskAccepted(task.id)
              const isHidden = isRecurringTaskHidden(task.id)
              return (
                <div
                  key={task.id}
                  className={`group flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                    isHidden
                        ? "border-dashed border-border/40 bg-muted/20 opacity-65"
                        : isAccepted
                          ? "border-border/50 hover:bg-muted/50"
                          : "border-dashed border-amber-500/40 bg-amber-500/5"
                  }`}
                >
                  <RefreshCw className={`mt-1 h-4 w-4 shrink-0 ${isAccepted ? "text-chart-1" : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${isHidden ? "text-muted-foreground" : "text-card-foreground"}`}>
                        {task.title}
                      </p>
                      {isHidden && (
                        <span className="rounded-full border border-border/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                          No la realizo
                        </span>
                      )}
                      {!isHidden && !isAccepted && (
                        <span className="rounded-full border border-amber-500/40 px-2 py-0.5 text-[11px] text-amber-600">
                          Pendiente de aceptar
                        </span>
                      )}
                      {!isHidden && isAccepted && (
                        <span className="rounded-full border border-chart-1/30 px-2 py-0.5 text-[11px] text-chart-1">
                          Aceptada
                        </span>
                      )}
                    </div>
                    <p className={`mt-0.5 text-xs ${isHidden ? "text-muted-foreground/70" : "text-muted-foreground line-clamp-2"}`}>
                      {task.description}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={isAccepted ? "outline" : "default"}
                    size="sm"
                    className="shrink-0"
                    onClick={() => handleAcceptanceToggle(task)}
                  >
                    {isAccepted ? <X className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}
                    {isAccepted ? "Desaceptar" : "Aceptar"}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
