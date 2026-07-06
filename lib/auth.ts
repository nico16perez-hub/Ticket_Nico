import type { User } from "@/lib/types"

const TOKEN_KEY = "token"
const USER_KEYS = ["id", "name", "surname", "userName", "role", "area"] as const

function readFromStorages(key: string): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(key) ?? sessionStorage.getItem(key)
}

// ── Token helpers ───────────────────────────────────────────
export function getToken(): string | null {
  return readFromStorages(TOKEN_KEY)
}

export function setToken(token: string, remember = true): void {
  if (typeof window === "undefined") return
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    sessionStorage.setItem(TOKEN_KEY, token)
  }
}

// ── User helpers ────────────────────────────────────────────
export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null
  const token = readFromStorages(TOKEN_KEY)
  const id = readFromStorages("id")
  const name = readFromStorages("name")
  if (!token || !id || !name) return null

  // read other fields from either storage
  const surname = readFromStorages("surname") ?? ""
  const userName = readFromStorages("userName") ?? ""
  const role = (readFromStorages("role") as "ADMIN" | "USER") ?? "USER"
  const area = readFromStorages("area") ?? ""

  return {
    id: Number(id),
    name: name,
    surname,
    userName,
    role,
    area,
    token,
  }
}

export function storeUser(user: User, remember: boolean): void {
  // store token and user fields in the chosen storage
  if (typeof window === "undefined") return
  if (remember) {
    localStorage.setItem(TOKEN_KEY, user.token)
    localStorage.setItem("id", String(user.id))
    localStorage.setItem("name", user.name)
    localStorage.setItem("surname", user.surname)
    localStorage.setItem("userName", user.userName)
    localStorage.setItem("role", user.role)
    localStorage.setItem("area", user.area)
  } else {
    sessionStorage.setItem(TOKEN_KEY, user.token)
    sessionStorage.setItem("id", String(user.id))
    sessionStorage.setItem("name", user.name)
    sessionStorage.setItem("surname", user.surname)
    sessionStorage.setItem("userName", user.userName)
    sessionStorage.setItem("role", user.role)
    sessionStorage.setItem("area", user.area)
  }
}

export function clearAuth(): void {
  if (typeof window === "undefined") return
  // remove from both storages to be safe
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  for (const key of USER_KEYS) {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  }
}

export function isAdmin(user: User | null): boolean {
  return user?.role === "ADMIN"
}
