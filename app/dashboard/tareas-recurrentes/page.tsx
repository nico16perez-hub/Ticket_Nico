import { RecurringTaskForm } from "@/components/recurring-tasks/recurring-task-form"
import { RecurringTaskList } from "@/components/recurring-tasks/recurring-task-list"

export default function TareasRecurrentesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Tareas Recurrentes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configura las tareas recurrentes compartidas del sistema. Haciendo click en cada una se agregan automaticamente al registro del dia.
        </p>
      </div>
      <RecurringTaskForm />
      <RecurringTaskList />
    </div>
  )
}
