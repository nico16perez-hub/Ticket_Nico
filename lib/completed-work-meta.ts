"use client"

type CompletedWorkMeta = {
  solution?: string
  timestamp?: string
  editedBy?: string
  editedAt?: string
  editHistory?: { by: string; at: string }[]
}

const STORAGE_KEY = "completed-work-meta"
const LEGACY_PREFIX = "completed-work-meta:"

function readAll(): Record<string, CompletedWorkMeta> {
  if (typeof window === "undefined") return {}

  try {
    const merged: Record<string, CompletedWorkMeta> = {}

    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        Object.assign(merged, parsed as Record<string, CompletedWorkMeta>)
      }
    }

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key || !key.startsWith(LEGACY_PREFIX)) continue

      const legacyRaw = window.localStorage.getItem(key)
      if (!legacyRaw) continue

      const parsed = JSON.parse(legacyRaw)
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue

      Object.assign(merged, parsed as Record<string, CompletedWorkMeta>)
    }

    return merged
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, CompletedWorkMeta>) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function saveCompletedWorkMeta(
  userId: number,
  workId: string | number,
  meta: CompletedWorkMeta
) {
  if (typeof window === "undefined") return

  const current = readAll()
  current[String(workId)] = {
    ...(current[String(workId)] ?? {}),
    ...meta,
  }
  writeAll(current)
}

export function getCompletedWorkMeta(userId: number, workId: string | number) {
  return readAll()[String(workId)] ?? null
}

export function readCompletedWorkMetaCache() {
  return readAll()
}
