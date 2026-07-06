import { WorkForm } from "@/components/completed-work/work-form"
import { WorkList } from "@/components/completed-work/work-list"

export default function TrabajosRealizadosPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Trabajos Realizados
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registra las tareas que realizaste por iniciativa propia, sin que haya habido un reclamo.
        </p>
      </div>
      <WorkForm />
      <WorkList />
    </div>
  )
}
