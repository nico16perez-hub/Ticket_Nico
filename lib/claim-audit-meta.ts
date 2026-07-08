"use client"

export type ClaimAuditMeta = {
  createdBy?: string
  createdAt?: string
  editedBy?: string
  editedAt?: string
  resolvedBy?: string
  resolvedAt?: string
  editHistory?: { by: string; at: string }[]
  resolutionHistory?: { by: string; at: string }[]
}

const STORAGE_KEY = "claim-audit-meta"

function readAll(): Record<string, ClaimAuditMeta> {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}

    return parsed as Record<string, ClaimAuditMeta>
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, ClaimAuditMeta>) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function getClaimAuditMeta(_userId: number, claimId: string | number) {
  return readAll()[String(claimId)] ?? null
}

export function readClaimAuditCache() {
  return readAll()
}

export function saveClaimAuditMeta(
  _userId: number,
  claimId: string | number,
  meta: ClaimAuditMeta
) {
  if (typeof window === "undefined") return

  const current = readAll()
  current[String(claimId)] = {
    ...(current[String(claimId)] ?? {}),
    ...meta,
  }
  writeAll(current)
}
