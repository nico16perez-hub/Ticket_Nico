// ── User & Auth ──────────────────────────────────────────────
export interface User {
  id: number
  name: string
  surname: string
  userName: string
  role: "ADMIN" | "USER"
  area: string
  token: string
}

export interface LoginCredentials {
  userName: string
  password: string
  remember: boolean
}

// ── Tareas Recurrentes (templates del usuario) ──────────────
export interface RecurringTask {
  id: string | number
  userId: number
  title: string
  description: string
}

// ── Tarea del dia (instancia activada) ──────────────────────
export interface DailyTask {
  id: string | number
  userId: number
  userName: string
  date: string
  type: "recurrente" | "reclamo" | "trabajo"
  title: string
  description: string
  area?: string
  timestamp?: string
}

// ── Reclamo / Ticket ────────────────────────────────────────
export interface Claim {
  id: string | number
  userId: number
  userName: string
  date: string
  title: string
  area: string
  claimant: string
  problemType: string
  description: string
  solution: string
  images: string[] | null
  createdBy?: string
  createdAt?: string
  editedBy?: string
  editedAt?: string
  resolvedBy?: string
  resolvedAt?: string
  editCount?: number
  editHistory?: { by: string; at: string }[]
  resolutionHistory?: { by: string; at: string }[]
}

// ── Trabajo realizado (sin reclamo) ─────────────────────────
export interface CompletedWork {
  id: string | number
  userId: number
  userName: string
  date: string
  title: string
  area: string
  description: string
  solution?: string
  createdAt?: string
  editedBy?: string
  editedAt?: string
}

export interface DashboardRecurringTask {
  id: number
  userId: number
  userName: string
  title: string
  description: string
}

export interface DashboardToday {
  date: string
  recurringTasks: DashboardRecurringTask[]
  dailyTasks?: DailyTask[]
  claims: Claim[]
  completedWorks: CompletedWork[]
}

// ── Forms ───────────────────────────────────────────────────
export interface RecurringTaskFormValues {
  title: string
  description: string
}

export interface ClaimFormValues {
  date?: string
  time?: string
  title: string
  area: string
  claimant: string
  problemType: string
  description: string
  solution: string
  images: string[]
}

export interface CompletedWorkFormValues {
  date?: string
  time?: string
  title: string
  area: string
  description: string
  solution?: string
}

// ── Reports ─────────────────────────────────────────────────
export type ReportPeriod = "today" | "week" | "month"

export interface ReportEntry {
  id: string | number
  date: string
  timestamp?: string
  userName: string
  type: "recurrente" | "reclamo" | "trabajo"
  title: string
  area: string
  description: string
  solution?: string | null
}

export interface CountEntry {
  key?: string
  label?: string
  name?: string
  count?: number
  total?: number
  value?: number
}

export interface StatisticsSummary {
  startDate: string
  endDate: string
  itemsByRecordType: CountEntry[]
  itemsByArea: CountEntry[]
  claimsByProblemType: CountEntry[]
  itemsByUser: CountEntry[]
  claimsByClaimant: CountEntry[]
  totalItems: number
  totalClaims: number
  totalCompletedWorks: number
  totalRecurringTasks: number
}
