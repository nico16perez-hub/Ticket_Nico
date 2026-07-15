import type { User } from "@/lib/types"

const TOKEN_KEY = "token"
const USER_KEYS = ["id", "name", "surname", "userName", "role", "area"] as const
let volatileToken: string | null = null
let volatileUser: User | null = null

function readFromStorages(key: string): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(key) ?? sessionStorage.getItem(key)
}

// ── Token helpers ───────────────────────────────────────────
export function getToken(): string | null {
  return readFromStorages(TOKEN_KEY) ?? volatileToken
}

export function setToken(token: string, remember = true): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  volatileToken = null
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    sessionStorage.setItem(TOKEN_KEY, token)
  }
}

// ── User helpers ────────────────────────────────────────────
export function getStoredUser(): User | null {
  return volatileUser
}

export function storeUser(user: User, remember: boolean): void {
  if (typeof window === "undefined") return
  volatileUser = user
  setToken(user.token, remember)
}

export function clearAuth(): void {
  if (typeof window === "undefined") return
  // remove from both storages to be safe
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  volatileToken = null
  volatileUser = null
  for (const key of USER_KEYS) {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  }
}

export function isAdmin(user: User | null): boolean {
  const role = user?.role?.trim().toLowerCase()
  return role === "admin" || role?.includes("admin") || false
}
