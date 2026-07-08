"use client"

import { useMemo, useState } from "react"
import { useData } from "@/lib/data-context"
import { AREAS, PROBLEM_TYPES } from "@/lib/constants"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertTriangle, ChevronDown, ChevronUp, Eye, Pencil, Save } from "lucide-react"
import type { Claim, ClaimFormValues } from "@/lib/types"
import { updateClaimVerbose } from "@/lib/api"
import { toast } from "sonner"

export function ClaimList() {
  const { claims, todayStr } = useData()
  const [isOpen, setIsOpen] = useState(true)
  const [editingClaim, setEditingClaim] = useState<Claim | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [editData, setEditData] = useState<ClaimFormValues>({
    title: "",
    area: "",
    claimant: "",
    problemType: "",
    description: "",
    solution: "",
    images: [],
  })

  const todayClaims = useMemo(
    () => claims.filter((c) => c.date === todayStr || c.date.startsWith(`${todayStr}T`)),
    [claims, todayStr]
  )

  const openEdit = (claim: Claim) => {
    setEditingClaim(claim)
    setEditData({
      title: claim.title,
      area: claim.area,
      claimant: claim.claimant,
      problemType: claim.problemType,
      description: claim.description,
      solution: claim.solution,
      images: claim.images ?? [],
    })
  }

  const onSave = async () => {
    if (!editingClaim) return
    setIsSaving(true)
    const result = await updateClaimVerbose(editingClaim.id, editData)
    setIsSaving(false)

    if (result.claim) {
      toast.success("Reclamo actualizado")
      setEditingClaim(null)
    } else {
      toast.error(result.error ?? "No se pudo actualizar el reclamo")
    }
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border-border/50">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer pb-3 hover:bg-muted/30 transition-colors">
              <CardTitle className="flex items-center justify-between text-lg text-card-foreground">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                  Reclamos de hoy
                  {todayClaims.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-sm">
                      {todayClaims.length}
                    </Badge>
                  )}
                </span>
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {todayClaims.length === 0 ? (
                <p className="py-6 text-center text-base text-muted-foreground">
                  No hay reclamos registrados hoy
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {todayClaims.map((claim) => (
                    <div
                      key={claim.id}
                      className="flex items-start gap-3 rounded-lg border border-border/50 p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-base font-medium text-card-foreground">
                            {claim.title}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {claim.problemType}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {claim.area} - {claim.claimant}
                        </p>
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver detalle</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle className="text-foreground text-xl">{claim.title}</DialogTitle>
                          </DialogHeader>
                          <div className="flex flex-col gap-3 text-base">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Area</p>
                                <p className="text-foreground">{claim.area}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Reclama</p>
                                <p className="text-foreground">{claim.claimant}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                                <p className="text-foreground">{claim.problemType}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Descripcion</p>
                              <p className="text-foreground whitespace-pre-wrap">{claim.description}</p>
                            </div>
                            {claim.solution && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Solucion</p>
                                <p className="text-foreground whitespace-pre-wrap">{claim.solution}</p>
                              </div>
                            )}
                            {(claim.images?.length ?? 0) > 0 && (
                              <div>
                                <p className="mb-2 text-sm font-medium text-muted-foreground">
                                  Capturas ({claim.images?.length ?? 0})
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  {claim.images?.map((src, i) => (
                                    <img
                                      key={i}
                                      src={src}
                                      alt={`Captura ${i + 1}`}
                                      className="rounded-lg border border-border object-cover aspect-video w-full"
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => openEdit(claim)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Editar reclamo</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Dialog open={!!editingClaim} onOpenChange={(open) => !open && setEditingClaim(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Editar reclamo</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              className="text-base"
              placeholder="Titulo"
              value={editData.title}
              onChange={(e) => setEditData((prev) => ({ ...prev, title: e.target.value }))}
            />
            <Input
              className="text-base"
              placeholder="Persona que reclama"
              value={editData.claimant}
              onChange={(e) => setEditData((prev) => ({ ...prev, claimant: e.target.value }))}
            />

            <Select
              value={editData.area}
              onValueChange={(value) => setEditData((prev) => ({ ...prev, area: value }))}
            >
              <SelectTrigger className="text-base w-full">
                <SelectValue placeholder="Area" />
              </SelectTrigger>
              <SelectContent>
                {AREAS.map((area) => (
                  <SelectItem key={area} value={area}>{area}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={editData.problemType}
              onValueChange={(value) => setEditData((prev) => ({ ...prev, problemType: value }))}
            >
              <SelectTrigger className="text-base w-full">
                <SelectValue placeholder="Tipo de problema" />
              </SelectTrigger>
              <SelectContent>
                {PROBLEM_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Textarea
            className="text-base min-h-[100px]"
            placeholder="Descripcion"
            value={editData.description}
            onChange={(e) => setEditData((prev) => ({ ...prev, description: e.target.value }))}
          />

          <Textarea
            className="text-base min-h-[80px]"
            placeholder="Solucion"
            value={editData.solution}
            onChange={(e) => setEditData((prev) => ({ ...prev, solution: e.target.value }))}
          />

          <div className="flex justify-end">
            <Button onClick={onSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              Guardar cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
