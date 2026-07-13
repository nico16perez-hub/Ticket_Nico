"use client"

import { useData } from "@/lib/data-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Plus, Minus } from "lucide-react"
import { toast } from "sonner"

export function RecurringTaskList() {
  const {
    recurringTasks,
    activateRecurringTask,
    deactivateRecurringTask,
    isRecurringActivatedToday,
  } = useData()

  async function handleDailyToggle(task: (typeof recurringTasks)[number]) {
    if (isRecurringActivatedToday(task.id)) {
      const removed = await deactivateRecurringTask(task)
      if (removed) {
        toast.success(`"${task.title}" quitada del registro de hoy`)
      }
      return
    }

    const activated = await activateRecurringTask(task)
    if (activated) {
      toast.success(`"${task.title}" agregada al registro de hoy`)
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
              Crea una desde el formulario de arriba para que todos puedan sumarla al registro diario
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recurringTasks.map((task) => {
              const isActivatedToday = isRecurringActivatedToday(task.id)
              return (
                <div
                  key={task.id}
                  className={`group flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                    isActivatedToday
                      ? "border-chart-1/40 bg-chart-1/5 hover:bg-chart-1/10"
                      : "border-dashed border-border/50 hover:bg-muted/40"
                  }`}
                >
                  <RefreshCw className={`mt-1 h-4 w-4 shrink-0 ${isActivatedToday ? "text-chart-1" : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-card-foreground">
                        {task.title}
                      </p>
                      {isActivatedToday ? (
                        <span className="rounded-full border border-chart-1/30 px-2 py-0.5 text-[11px] text-chart-1">
                          Registrada hoy
                        </span>
                      ) : (
                        <span className="rounded-full border border-border/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                          Pendiente hoy
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {task.description}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={isActivatedToday ? "outline" : "default"}
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => handleDailyToggle(task)}
                  >
                    {isActivatedToday ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    <span className="sr-only">
                      {isActivatedToday ? "Quitar del registro de hoy" : "Agregar al registro de hoy"}
                    </span>
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
