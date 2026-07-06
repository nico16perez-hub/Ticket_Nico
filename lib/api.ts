import { API_URL } from "@/lib/constants"
import { getToken } from "@/lib/auth"
import type {
  RecurringTask,
  RecurringTaskFormValues,
  Claim,
  ClaimFormValues,
  CompletedWork,
  CompletedWorkFormValues,
  DailyTask,
  DashboardToday,
  ReportEntry,
  ReportPeriod,
  StatisticsSummary,
} from "@/lib/types"

// ── Fetch wrapper with auth ─────────────────────────────────
async function authFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_URL}/api${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`)
  }
  return res.json()
}

export async function getDashboardToday(date?: string): Promise<DashboardToday | null> {
  try {
    const query = date ? `?date=${date}` : ""
    return await authFetch<DashboardToday>(`/dashboard/today${query}`)
  } catch {
    return null
  }
}

// ── Tareas Recurrentes ──────────────────────────────────────
export async function getRecurringTasks(userId: number): Promise<RecurringTask[]> {
  try {
    return await authFetch<RecurringTask[]>(`/recurring-tasks/${userId}`)
  } catch {
    return []
  }
}

export async function createRecurringTask(
  userId: number,
  data: RecurringTaskFormValues
): Promise<RecurringTask | null> {
  try {
    return await authFetch<RecurringTask>("/recurring-tasks", {
      method: "POST",
      body: JSON.stringify({ ...data, userId }),
    })
  } catch {
    return null
  }
}

export async function deleteRecurringTask(id: number): Promise<boolean> {
  try {
    await authFetch(`/recurring-tasks/${id}`, { method: "DELETE" })
    return true
  } catch {
    return false
  }
}

// ── Tareas del dia ──────────────────────────────────────────
export async function getDailyTasks(userId: number, date: string): Promise<DailyTask[]> {
  try {
    return await authFetch<DailyTask[]>(`/daily-tasks/${userId}?date=${date}`)
  } catch {
    return []
  }
}

export async function addDailyTask(data: Omit<DailyTask, "id">): Promise<DailyTask | null> {
  try {
    return await authFetch<DailyTask>("/daily-tasks", {
      method: "POST",
      body: JSON.stringify(data),
    })
  } catch {
    return null
  }
}

// ── Reclamos ────────────────────────────────────────────────
export async function getClaims(userId: number, date?: string): Promise<Claim[]> {
  try {
    const query = date ? `?date=${date}` : ""
    return await authFetch<Claim[]>(`/claims/${userId}${query}`)
  } catch {
    return []
  }
}

export async function getClaimDetail(id: string | number): Promise<Claim | null> {
  try {
    return await authFetch<Claim>(`/claims/detail/${id}`)
  } catch {
    return null
  }
}

export async function createClaim(
  userId: number,
  userName: string,
  data: ClaimFormValues
): Promise<Claim | null> {
  try {
    return await authFetch<Claim>("/claims", {
      method: "POST",
      body: JSON.stringify({ ...data, userId, userName }),
    })
  } catch {
    return null
  }
}

export async function updateClaim(
  id: string | number,
  data: Partial<ClaimFormValues>
): Promise<Claim | null> {
  try {
    return await authFetch<Claim>(`/claims/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  } catch {
    return null
  }
}

// ── Trabajos Realizados ─────────────────────────────────────
export async function getCompletedWorks(userId: number, date?: string): Promise<CompletedWork[]> {
  try {
    const query = date ? `?date=${date}` : ""
    return await authFetch<CompletedWork[]>(`/completed-works/${userId}${query}`)
  } catch {
    return []
  }
}

export async function createCompletedWork(
  userId: number,
  userName: string,
  data: CompletedWorkFormValues
): Promise<CompletedWork | null> {
  try {
    return await authFetch<CompletedWork>("/completed-works", {
      method: "POST",
      body: JSON.stringify({ ...data, userId, userName }),
    })
  } catch {
    return null
  }
}

export async function updateCompletedWork(
  id: number,
  data: Partial<CompletedWorkFormValues>
): Promise<CompletedWork | null> {
  try {
    return await authFetch<CompletedWork>(`/completed-works/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  } catch {
    return null
  }
}

// ── Informes (admin) ────────────────────────────────────────
export async function getReport(period: ReportPeriod): Promise<ReportEntry[]> {
  try {
    return await authFetch<ReportEntry[]>(`/reports?period=${period}`)
  } catch {
    return []
  }
}


export async function getStatisticsSummary(
  startDate: string,
  endDate: string
): Promise<StatisticsSummary | null> {
  try {
    return await authFetch<StatisticsSummary>(`/statistics/summary?startDate=${startDate}&endDate=${endDate}`)
  } catch {
    return null
  }
}


// ── Usuarios (admin) ───────────────────────────────────────

export interface UserPayload {
  name: string
  surname: string
  userName: string
  password: string
  area: string
  role: "ADMIN" | "USER"
}

export interface ManagedUser {
  id?: number
  name: string
  surname: string
  userName: string
  role: "ADMIN" | "USER"
  area?: string
}

async function userMutation(endpoint: string, options: RequestInit): Promise<string> {
  try {
    const token = getToken()
    const res = await fetch(`${API_URL}/api${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })

    const message = await res.text()
    return message || (res.ok ? "Operacion completada" : "Error al procesar la solicitud")
  } catch {
    return "Error de conexion con el servidor"
  }
}

export async function createUser(data: UserPayload): Promise<string> {
  return userMutation("/v1/users/create", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function editUser(data: UserPayload): Promise<string> {
  return userMutation("/v1/users/edit", {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteUser(name: string): Promise<string> {
  return userMutation(`/v1/users/delete/${encodeURIComponent(name)}`, {
    method: "DELETE",
  })
}

export async function getUsers(): Promise<ManagedUser[]> {
  try {
    return await authFetch<ManagedUser[]>("/v1/users/getUsers")
  } catch {
    return []
  }
}

export async function getUserByName(userName: string): Promise<ManagedUser | null> {
  try {
    return await authFetch<ManagedUser>(`/v1/users/getUserByName/${encodeURIComponent(userName)}`)
  } catch {
    return null
  }
}

// ── Imagenes ────────────────────────────────────────────────
export async function uploadImage(file: File): Promise<string | null> {
  try {
    const token = getToken()
    const formData = new FormData()
    formData.append("image", file)

    const res = await fetch(`${API_URL}/api/images/upload`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    })

    if (!res.ok) throw new Error("Upload failed")
    const data = await res.json()
    return data.url ?? null
  } catch {
    return null
  }
}
