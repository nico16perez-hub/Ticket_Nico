import type { User } from "@/lib/types"

export function canViewAllTasks(user: User | null): boolean {
  if (!user) return false

  const role = user.role.trim().toLowerCase()
  if (role === "admin" || role.includes("admin")) return true

  return user.area.trim().toLowerCase().includes("sistema")
}
