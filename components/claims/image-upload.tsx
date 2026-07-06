"use client"

import { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ImagePlus, X, Loader2 } from "lucide-react"
import { uploadImage } from "@/lib/api"
import { toast } from "sonner"

interface ImageUploadProps {
  images: string[]
  onChange: (images: string[]) => void
}

export function ImageUpload({ images, onChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      const imageFiles = fileArray.filter((f) => f.type.startsWith("image/"))

      if (imageFiles.length === 0) return

      setUploading(true)
      const uploadedUrls: string[] = []

      for (const file of imageFiles) {
        const url = await uploadImage(file)
        if (url) {
          uploadedUrls.push(url)
        } else {
          toast.error(`Error al subir ${file.name}`)
        }
      }

      if (uploadedUrls.length > 0) {
        onChange([...images, ...uploadedUrls])
      }
      setUploading(false)
    },
    [images, onChange]
  )

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleRemove(index: number) {
    onChange(images.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
          uploading
            ? "pointer-events-none opacity-60 border-border"
            : isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
        }`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !uploading) {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
      >
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">Subiendo imagenes...</p>
          </>
        ) : (
          <>
            <ImagePlus className="h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              Arrastra imagenes aqui o hace click para seleccionar
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              PNG, JPG, GIF - Capturas de pantalla, fotos, etc.
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) processFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      {/* Previews */}
      {images?.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {images.map((src, i) => (
            <div key={i} className="group relative aspect-video overflow-hidden rounded-lg border border-border">
              <img
                src={src}
                alt={`Captura ${i + 1}`}
                className="h-full w-full object-cover"
                crossOrigin="anonymous"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => handleRemove(i)}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Eliminar imagen</span>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
