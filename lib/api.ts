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
  User,
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
    const message = await res.text().catch(() => "")
    throw new Error(message || `Error ${res.status}: ${res.statusText}`)
  }
  const text = await res.text()
  if (!text) return undefined as T

  return JSON.parse(text) as T
}

export async function getDashboardToday(date?: string): Promise<DashboardToday | null> {
  try {
    const query = date ? `?date=${date}` : ""
    return await authFetch<DashboardToday>(`/dashboard/today${query}`)
  } catch {
    return null
  }
}

export interface SharedDashboardData {
  dailyTasks: DailyTask[]
  claims: Claim[]
  completedWorks: CompletedWork[]
}

type RawCompletedWork = CompletedWork & {
  created_at?: string
  edited_at?: string
  edited_by?: string
  work_date?: string
}

function normalizeCompletedWork(work: RawCompletedWork): CompletedWork {
  return {
    ...work,
    date: work.date ?? work.work_date ?? "",
    createdAt: work.createdAt ?? work.created_at,
    editedAt: work.editedAt ?? work.edited_at,
    editedBy: work.editedBy ?? work.edited_by,
  }
}

function normalizeCompletedWorks(works: RawCompletedWork[] = []): CompletedWork[] {
  return works.map(normalizeCompletedWork)
}

function mapDashboardTodayToSharedData(_date: string, dashboard: DashboardToday | null): SharedDashboardData | null {
  if (!dashboard) return null

  return {
    dailyTasks: dashboard.dailyTasks ?? [],
    claims: dashboard.claims ?? [],
    completedWorks: normalizeCompletedWorks(dashboard.completedWorks as RawCompletedWork[]),
  }
}

export async function getCurrentUser(): Promise<User> {
  const token = getToken()
  const user = await authFetch<Omit<User, "token">>("/auth/me")
  return { ...user, token: token ?? "" }
}

export async function getSharedDashboardData(date: string): Promise<SharedDashboardData> {
  try {
    const dashboard = await getDashboardToday(date)
    const data = mapDashboardTodayToSharedData(date, dashboard)

    if (data) {
      return data
    }
  } catch {
    // continue with the legacy per-user fallback below
  }

  try {
    const users = await getUsers()
    const userIds = Array.from(
      new Set(
        users
          .map((item) => (typeof item.id === "number" ? item.id : null))
          .filter((id): id is number => id !== null)
      )
    )

    if (userIds.length === 0) {
      return {
        dailyTasks: [],
        claims: [],
        completedWorks: [],
      }
    }

    const [dailyTasksByUser, claimsByUser, completedWorksByUser] = await Promise.all([
      Promise.all(userIds.map((userId) => getDailyTasks(userId, date))),
      Promise.all(userIds.map((userId) => getClaims(userId, date))),
      Promise.all(userIds.map((userId) => getCompletedWorks(userId, date))),
    ])

    const data = {
      dailyTasks: dailyTasksByUser.flat(),
      claims: claimsByUser.flat(),
      completedWorks: normalizeCompletedWorks(completedWorksByUser.flat() as RawCompletedWork[]),
    }

    return data
  } catch {
    return {
      dailyTasks: [],
      claims: [],
      completedWorks: [],
    }
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

export async function getRecurringTaskCatalog(): Promise<RecurringTask[]> {
  try {
    return await authFetch<RecurringTask[]>("/recurring-tasks")
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

export async function createRecurringTaskVerbose(
  userId: number,
  data: RecurringTaskFormValues
): Promise<{ task: RecurringTask | null; error?: string }> {
  try {
    const task = await authFetch<RecurringTask>("/recurring-tasks", {
      method: "POST",
      body: JSON.stringify({ ...data, userId }),
    })
    return { task }
  } catch (error) {
    return {
      task: null,
      error: error instanceof Error ? error.message : "Error al guardar la tarea recurrente",
    }
  }
}

export async function deleteRecurringTask(id: string | number): Promise<boolean> {
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

export async function addDailyTaskVerbose(
  data: Omit<DailyTask, "id">
): Promise<{ task: DailyTask | null; error?: string }> {
  try {
    const task = await authFetch<DailyTask>("/daily-tasks", {
      method: "POST",
      body: JSON.stringify(data),
    })
    return { task }
  } catch (error) {
    return {
      task: null,
      error: error instanceof Error ? error.message : "Error al activar la tarea",
    }
  }
}

// ── Reclamos ────────────────────────────────────────────────
export async function deleteDailyTask(id: string | number): Promise<boolean> {
  try {
    await authFetch(`/daily-tasks/${id}`, { method: "DELETE" })
    return true
  } catch {
    return false
  }
}

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

export async function createClaimVerbose(
  userId: number,
  userName: string,
  data: ClaimFormValues
): Promise<{ claim: Claim | null; error?: string }> {
  try {
    const claim = await authFetch<Claim>("/claims", {
      method: "POST",
      body: JSON.stringify({ ...data, userId, userName }),
    })
    return { claim }
  } catch (error) {
    return {
      claim: null,
      error: error instanceof Error ? error.message : "Error al registrar el reclamo",
    }
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

export async function updateClaimVerbose(
  id: string | number,
  data: Partial<ClaimFormValues>
): Promise<{ claim: Claim | null; error?: string }> {
  try {
    const claim = await authFetch<Claim>(`/claims/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
    return { claim }
  } catch (error) {
    return {
      claim: null,
      error: error instanceof Error ? error.message : "Error al actualizar el reclamo",
    }
  }
}

// ── Trabajos Realizados ─────────────────────────────────────
export async function getCompletedWorks(userId: number, date?: string): Promise<CompletedWork[]> {
  try {
    const query = date ? `?date=${date}` : ""
    const works = await authFetch<RawCompletedWork[]>(`/completed-works/${userId}${query}`)
    return normalizeCompletedWorks(works)
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
    const work = await authFetch<RawCompletedWork>("/completed-works", {
      method: "POST",
      body: JSON.stringify({ ...data, userId, userName }),
    })
    return normalizeCompletedWork(work)
  } catch {
    return null
  }
}

export async function createCompletedWorkVerbose(
  userId: number,
  userName: string,
  data: CompletedWorkFormValues
): Promise<{ work: CompletedWork | null; error?: string }> {
  try {
    const work = await authFetch<RawCompletedWork>("/completed-works", {
      method: "POST",
      body: JSON.stringify({ ...data, userId, userName }),
    })
    return { work: normalizeCompletedWork(work) }
  } catch (error) {
    return {
      work: null,
      error: error instanceof Error ? error.message : "Error al registrar el trabajo",
    }
  }
}

export async function updateCompletedWork(
  id: string | number,
  data: Partial<CompletedWorkFormValues>
): Promise<CompletedWork | null> {
  try {
    const work = await authFetch<RawCompletedWork>(`/completed-works/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
    return normalizeCompletedWork(work)
  } catch {
    return null
  }
}

export async function updateCompletedWorkVerbose(
  id: string | number,
  data: Partial<CompletedWorkFormValues>
): Promise<{ work: CompletedWork | null; error?: string }> {
  try {
    const work = await authFetch<RawCompletedWork>(`/completed-works/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
    return { work: normalizeCompletedWork(work) }
  } catch (error) {
    return {
      work: null,
      error: error instanceof Error ? error.message : "Error al editar el trabajo",
    }
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
  id?: string | number
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
    if (!res.ok) {
      return `Error: ${message || "Error al procesar la solicitud"}`
    }

    return message || "Operacion completada"
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
