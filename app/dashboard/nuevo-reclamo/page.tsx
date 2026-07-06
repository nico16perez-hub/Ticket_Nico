import { ClaimForm } from "@/components/claims/claim-form"
import { ClaimList } from "@/components/claims/claim-list"

export default function NuevoReclamoPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Nuevo Reclamo
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registra los llamados y reclamos que recibis. Podes adjuntar capturas de pantalla.
        </p>
      </div>
      <ClaimForm />
      <ClaimList />
    </div>
  )
}
