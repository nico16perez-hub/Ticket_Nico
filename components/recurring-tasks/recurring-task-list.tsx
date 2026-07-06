"use client"

import { useData } from "@/lib/data-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Trash2, Check, Plus, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

export function RecurringTaskList() {
  const {
    recurringTasks,
    removeRecurringTask,
    activateRecurringTask,
    isRecurringActivatedToday,
    isRecurringTaskHidden,
    toggleRecurringTaskVisibility,
  } = useData()

  async function handleActivate(task: (typeof recurringTasks)[number]) {
    if (isRecurringTaskHidden(task.id)) {
      toast.info("Mostra la tarea antes de agregarla al dia")
      return
    }
    if (isRecurringActivatedToday(task.id)) {
      toast.info("Esta tarea ya fue agregada hoy")
      return
    }
    await activateRecurringTask(task)
    toast.success(`"${task.title}" agregada a las tareas del dia`)
  }

  async function handleDelete(id: number) {
    const deleted = await removeRecurringTask(id)
    if (deleted) {
      toast.success("Tarea recurrente quitada para tu usuario")
    }
  }

  async function handleVisibilityToggle(id: number) {
    const ok = await toggleRecurringTaskVisibility(id)
    if (ok) {
      toast.success("Visibilidad actualizada")
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
              No tenes tareas recurrentes visibles
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Crea una desde el formulario de arriba
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recurringTasks.map((task) => {
              const isActivated = isRecurringActivatedToday(task.id)
              const isHidden = isRecurringTaskHidden(task.id)
              return (
                <div
                  key={task.id}
                  className={`group flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                    isActivated
                      ? "border-chart-1/30 bg-chart-1/5 opacity-70"
                      : isHidden
                        ? "border-dashed border-border/40 bg-muted/20 opacity-65"
                        : "border-border/50 hover:bg-muted/50"
                  }`}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={`mt-0.5 h-8 w-8 shrink-0 ${
                      isActivated
                        ? "text-chart-1"
                        : isHidden
                          ? "text-muted-foreground"
                          : "text-chart-1"
                    }`}
                    onClick={() => handleActivate(task)}
                    disabled={isHidden}
                  >
                    {isActivated ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    <span className="sr-only">Agregar tarea al dia</span>
                  </Button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${isActivated || isHidden ? "text-muted-foreground" : "text-card-foreground"}`}>
                        {task.title}
                      </p>
                      {isHidden && (
                        <span className="rounded-full border border-border/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                          Oculta
                        </span>
                      )}
                    </div>
                    <p className={`mt-0.5 text-xs ${isHidden ? "text-muted-foreground/70" : "text-muted-foreground line-clamp-2"}`}>
                      {task.description}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => handleVisibilityToggle(task.id)}
                  >
                    {isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    <span className="sr-only">
                      {isHidden ? "Mostrar tarea recurrente" : "Ocultar tarea recurrente"}
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(task.id)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Quitar tarea recurrente de tu vista</span>
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
