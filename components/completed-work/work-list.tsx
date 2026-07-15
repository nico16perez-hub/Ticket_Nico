"use client"

import { useMemo, useState } from "react"
import { useData } from "@/lib/data-context"
import { AREAS } from "@/lib/constants"
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
import { Wrench, ChevronDown, ChevronUp, Eye, Pencil, Save } from "lucide-react"
import type { CompletedWork, CompletedWorkFormValues } from "@/lib/types"
import { toast } from "sonner"

export function WorkList() {
  const { completedWorks, todayStr, updateCompletedWork } = useData()
  const [isOpen, setIsOpen] = useState(true)
  const [editingWork, setEditingWork] = useState<CompletedWork | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [editData, setEditData] = useState<CompletedWorkFormValues>({
    title: "",
    area: "",
    description: "",
  })

  const todayWorks = useMemo(
    () => completedWorks.filter((w) => w.date === todayStr || w.date.startsWith(`${todayStr}T`)),
    [completedWorks, todayStr]
  )

  const openEdit = (work: CompletedWork) => {
    setEditingWork(work)
    setEditData({
      title: work.title,
      area: work.area,
      description: work.description,
      solution: work.solution ?? "",
    })
  }

  const onSave = async () => {
    if (!editingWork) return
    setIsSaving(true)
    const ok = await updateCompletedWork(editingWork.id, editData)
    setIsSaving(false)

    if (ok) {
      toast.success("Trabajo actualizado")
      setEditingWork(null)
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
                  <Wrench className="h-5 w-5 text-muted-foreground" />
                  Trabajos de hoy
                  {todayWorks.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-sm">
                      {todayWorks.length}
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
              {todayWorks.length === 0 ? (
                <p className="py-6 text-center text-base text-muted-foreground">
                  No hay trabajos registrados hoy
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {todayWorks.map((work) => (
                    <div
                      key={work.id}
                      className="flex items-start gap-3 rounded-lg border border-border/50 p-3"
                    >
                      <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-chart-2" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-base font-medium text-card-foreground">
                            {work.title}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {work.area}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                          {work.description}
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
                            <DialogTitle className="text-xl">{work.title}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3 text-base">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Area</p>
                              <p>{work.area}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Descripcion</p>
                              <p className="whitespace-pre-wrap">{work.description}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Solucion</p>
                              <p className="whitespace-pre-wrap">
                                {work.solution?.trim() || "Sin solucion registrada"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Hora</p>
                              <p>
                                {work.createdAt
                                  ? new Date(work.createdAt).toLocaleString([], {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : work.date
                                    ? new Date(work.date).toLocaleDateString()
                                    : "Sin hora registrada"}
                              </p>
                            </div>
                            <div className="rounded-md border border-border/50 bg-muted/20 p-3">
                              <p className="text-sm font-medium text-muted-foreground">Registro de edicion</p>
                              <p className="mt-1">
                                Editado por: {work.editedBy || "Sin ediciones registradas"}
                              </p>
                              <p>
                                Hora de edicion:{" "}
                                {work.editedAt
                                  ? new Date(work.editedAt).toLocaleString([], {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "Sin ediciones registradas"}
                              </p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => openEdit(work)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Dialog open={!!editingWork} onOpenChange={(open) => !open && setEditingWork(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Editar trabajo realizado</DialogTitle>
          </DialogHeader>

          <Input
            className="text-base"
            placeholder="Titulo"
            value={editData.title}
            onChange={(e) => setEditData((prev) => ({ ...prev, title: e.target.value }))}
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

          <Textarea
            className="text-base min-h-[120px]"
            placeholder="Descripcion"
            value={editData.description}
            onChange={(e) => setEditData((prev) => ({ ...prev, description: e.target.value }))}
          />

          <Textarea
            className="text-base min-h-[90px]"
            placeholder="Solucion"
            value={editData.solution ?? ""}
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
