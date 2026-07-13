"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import type {
  RecurringTask,
  DailyTask,
  Claim,
  CompletedWork,
  RecurringTaskFormValues,
  ClaimFormValues,
  CompletedWorkFormValues,
} from "@/lib/types"
import { useAuth } from "@/lib/auth-context"
import { canViewAllTasks } from "@/lib/access"
import { format } from "date-fns"
import * as api from "@/lib/api"
import { saveCompletedWorkMeta } from "@/lib/completed-work-meta"
import { readClaimAuditCache, saveClaimAuditMeta } from "@/lib/claim-audit-meta"
import { toast } from "sonner"

interface DataContextValue {
  // Tareas recurrentes
  recurringTasks: RecurringTask[]
  addRecurringTask: (data: RecurringTaskFormValues) => Promise<boolean>
  acceptRecurringTask: (task: RecurringTask) => Promise<boolean>
  removeRecurringTask: (id: string | number) => Promise<boolean>
  isRecurringTaskAccepted: (taskId: string | number) => boolean
  isRecurringTaskHidden: (taskId: string | number) => boolean
  toggleRecurringTaskVisibility: (id: string | number) => Promise<boolean>
  loadingRecurring: boolean

  // Tareas del dia
  dailyTasks: DailyTask[]
  activateRecurringTask: (task: RecurringTask) => Promise<boolean>
  deactivateRecurringTask: (task: RecurringTask) => Promise<boolean>
  isRecurringActivatedToday: (taskId: string | number) => boolean
  loadingDaily: boolean

  // Reclamos
  claims: Claim[]
  addClaim: (data: ClaimFormValues) => Promise<boolean>
  updateClaim: (id: string | number, data: ClaimFormValues) => Promise<boolean>
  loadingClaims: boolean

  // Trabajos realizados
  completedWorks: CompletedWork[]
  addCompletedWork: (data: CompletedWorkFormValues) => Promise<CompletedWork | null>
  updateCompletedWork: (id: string | number, data: CompletedWorkFormValues) => Promise<boolean>
  loadingWorks: boolean

  // Helpers
  todayStr: string
  refreshAll: () => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

const HIDDEN_RECURRING_TASKS_PREFIX = "hidden-recurring-tasks"

function normalizeRecurringValue(value: string) {
  return value.trim().toLowerCase()
}

function buildRecurringSignature(task: Pick<RecurringTask, "title" | "description">) {
  return `${normalizeRecurringValue(task.title)}::${normalizeRecurringValue(task.description)}`
}

function readHiddenRecurringTasks(userId: number) {
  if (typeof window === "undefined") return new Set<string>()

  try {
    const raw = window.localStorage.getItem(`${HIDDEN_RECURRING_TASKS_PREFIX}:${userId}`)
    if (!raw) return new Set<string>()

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set<string>()

    return new Set(parsed.filter((item): item is string => typeof item === "string"))
  } catch {
    return new Set<string>()
  }
}

function saveHiddenRecurringTasks(userId: number, hiddenTasks: Set<string>) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(
    `${HIDDEN_RECURRING_TASKS_PREFIX}:${userId}`,
    JSON.stringify(Array.from(hiddenTasks))
  )
}

function uniqueRecurringTasks(tasks: RecurringTask[]) {
  const seen = new Set<string>()
  const unique: RecurringTask[] = []

  for (const task of tasks) {
    const signature = buildRecurringSignature(task)
    if (seen.has(signature)) continue

    seen.add(signature)
    unique.push(task)
  }

  return unique
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const todayStr = format(new Date(), "yyyy-MM-dd")

  const [allRecurringTasks, setAllRecurringTasks] = useState<RecurringTask[]>([])
  const [acceptedRecurringTasks, setAcceptedRecurringTasks] = useState<RecurringTask[]>([])
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([])
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([])
  const [claims, setClaims] = useState<Claim[]>([])
  const [completedWorks, setCompletedWorks] = useState<CompletedWork[]>([])
  const [hiddenRecurringTasks, setHiddenRecurringTasks] = useState<Set<string>>(new Set())

  const [loadingRecurring, setLoadingRecurring] = useState(false)
  const [loadingDaily, setLoadingDaily] = useState(false)
  const [loadingClaims, setLoadingClaims] = useState(false)
  const [loadingWorks, setLoadingWorks] = useState(false)

  // ── Fetch data on mount ─────────────────────────────────
  const fetchRecurring = useCallback(async () => {
    if (!user) return []

    setLoadingRecurring(true)
    try {
      const [catalogData, userTasks] = await Promise.all([
        api.getRecurringTaskCatalog(),
        api.getRecurringTasks(user.id),
      ])
      const catalog = catalogData.length || !canViewAllTasks(user)
        ? catalogData
        : (
            await Promise.all(
              (await api.getUsers())
                .map((item) => (typeof item.id === "number" ? item.id : null))
                .filter((id): id is number => id !== null)
                .map((userId) => api.getRecurringTasks(userId))
            )
          ).flat()
      const uniqueTasks = uniqueRecurringTasks(catalog.length ? catalog : userTasks)
      const hidden = new Set<string>()

      setAllRecurringTasks(uniqueTasks)
      setAcceptedRecurringTasks(userTasks)
      setHiddenRecurringTasks(hidden)
      setRecurringTasks(uniqueTasks)
      return uniqueTasks
    } catch {
      toast.error("No se pudieron cargar las tareas recurrentes")
      return []
    } finally {
      setLoadingRecurring(false)
    }
  }, [user])

  const fetchDaily = useCallback(async () => {
    if (!user) return
    setLoadingDaily(true)
    setLoadingClaims(true)
    setLoadingWorks(true)

    const shared = canViewAllTasks(user)
      ? await api.getSharedDashboardData(todayStr)
      : {
          dailyTasks: await api.getDailyTasks(user.id, todayStr),
          claims: await api.getClaims(user.id, todayStr),
          completedWorks: await api.getCompletedWorks(user.id, todayStr),
        }

    setDailyTasks(shared.dailyTasks ?? [])
    setClaims(shared.claims ?? [])
    setCompletedWorks(shared.completedWorks ?? [])
    setLoadingDaily(false)
    setLoadingClaims(false)
    setLoadingWorks(false)
  }, [todayStr, user])

  const refreshAll = useCallback(async () => {
    setLoadingDaily(true)
    setLoadingClaims(true)
    setLoadingWorks(true)

    const [, shared] = await Promise.all([
      fetchRecurring(),
      canViewAllTasks(user)
        ? api.getSharedDashboardData(todayStr)
        : Promise.all([
            api.getDailyTasks(user?.id ?? 0, todayStr),
            api.getClaims(user?.id ?? 0, todayStr),
            api.getCompletedWorks(user?.id ?? 0, todayStr),
          ]).then(([dailyTasks, claims, completedWorks]) => ({
            dailyTasks,
            claims,
            completedWorks,
          })),
    ])

    setDailyTasks(shared.dailyTasks ?? [])
    setClaims(shared.claims ?? [])
    setCompletedWorks(shared.completedWorks ?? [])

    setLoadingDaily(false)
    setLoadingClaims(false)
    setLoadingWorks(false)
  }, [fetchRecurring, todayStr, user])

  useEffect(() => {
    if (user) {
      void (async () => {
        await refreshAll()
      })()
    }
  }, [user, refreshAll])

  useEffect(() => {
    if (!user) {
      const resetState = () => {
        setHiddenRecurringTasks(new Set())
        setAllRecurringTasks([])
        setAcceptedRecurringTasks([])
        setRecurringTasks([])
      }
      resetState()
      return
    }

    const loadHiddenState = async () => {
      setHiddenRecurringTasks(new Set())
    }

    void loadHiddenState()
  }, [user])

  // ── Tareas recurrentes ──────────────────────────────────
  const addRecurringTask = useCallback(
    async (data: RecurringTaskFormValues) => {
      if (!user) return false

      const signature = buildRecurringSignature(data)
      const existingTask = allRecurringTasks.find(
        (task) => buildRecurringSignature(task) === signature
      )
      const acceptedTask = acceptedRecurringTasks.find(
        (task) => buildRecurringSignature(task) === signature
      )

      if (acceptedTask) {
        if (hiddenRecurringTasks.has(signature)) {
          const nextHiddenTasks = new Set(hiddenRecurringTasks)
          nextHiddenTasks.delete(signature)
          setHiddenRecurringTasks(nextHiddenTasks)
          saveHiddenRecurringTasks(user.id, nextHiddenTasks)
          toast.success("Tarea recurrente restaurada para tu usuario")
          return true
        }

        toast.info("Esa tarea ya existe en el sistema")
        return false
      }

      const taskData = existingTask
        ? { title: existingTask.title, description: existingTask.description }
        : data
      const { task: created, error } = await api.createRecurringTaskVerbose(user.id, taskData)
      if (created) {
        await fetchRecurring()
        toast.success(existingTask ? "Tarea recurrente agregada para tu usuario" : "Tarea recurrente guardada")
        return true
      }

      toast.error(error ?? "Error al guardar la tarea recurrente")
      return false
    },
    [acceptedRecurringTasks, allRecurringTasks, fetchRecurring, hiddenRecurringTasks, user]
  )

  const acceptRecurringTask = useCallback(
    async (task: RecurringTask) => {
      return addRecurringTask({
        title: task.title,
        description: task.description,
      })
    },
    [addRecurringTask]
  )

  const removeRecurringTask = useCallback(async (id: string | number) => {
    const task = allRecurringTasks.find((item) => item.id === id)
    if (!task || !user) {
      toast.error("No se pudo identificar la tarea recurrente")
      return false
    }

    const signature = buildRecurringSignature(task)
    const acceptedTask = acceptedRecurringTasks.find(
      (item) => buildRecurringSignature(item) === signature
    )
    if (acceptedTask) {
      const deleted = await api.deleteRecurringTask(acceptedTask.id)
      if (!deleted) {
        toast.error("No se pudo quitar la tarea recurrente de tu usuario")
        return false
      }
      setAcceptedRecurringTasks((prev) =>
        prev.filter((item) => buildRecurringSignature(item) !== signature)
      )
    }

    const nextHiddenTasks = new Set(hiddenRecurringTasks)
    nextHiddenTasks.delete(signature)
    setHiddenRecurringTasks(nextHiddenTasks)
    saveHiddenRecurringTasks(user.id, nextHiddenTasks)
    return true
  }, [acceptedRecurringTasks, allRecurringTasks, hiddenRecurringTasks, user])

  const isRecurringTaskAccepted = useCallback(
    (taskId: string | number) => {
      const task = allRecurringTasks.find((item) => item.id === taskId)
      if (!task) return false
      const signature = buildRecurringSignature(task)
      return acceptedRecurringTasks.some((item) => buildRecurringSignature(item) === signature)
    },
    [acceptedRecurringTasks, allRecurringTasks]
  )

  const isRecurringTaskHidden = useCallback(
    (taskId: string | number) => {
      const task = allRecurringTasks.find((item) => item.id === taskId)
      if (!task) return false
      return hiddenRecurringTasks.has(buildRecurringSignature(task))
    },
    [allRecurringTasks, hiddenRecurringTasks]
  )

  const toggleRecurringTaskVisibility = useCallback(
    async (id: string | number) => {
      const task = allRecurringTasks.find((item) => item.id === id)
      if (!task || !user) return false

      const signature = buildRecurringSignature(task)
      const nextHiddenTasks = new Set(hiddenRecurringTasks)

      if (nextHiddenTasks.has(signature)) {
        nextHiddenTasks.delete(signature)
      } else {
        nextHiddenTasks.add(signature)
      }

      setHiddenRecurringTasks(nextHiddenTasks)
      saveHiddenRecurringTasks(user.id, nextHiddenTasks)
      return true
    },
    [allRecurringTasks, hiddenRecurringTasks, user]
  )

  const activateRecurringTask = useCallback(
    async (task: RecurringTask) => {
      if (!user) {
        toast.error("No se pudo identificar el usuario")
        return false
      }
      const dailyData = {
        userId: user.id,
        userName: `${user.name} ${user.surname}`,
        date: todayStr,
        type: "recurrente" as const,
        title: task.title,
        description: task.description,
        area: user.area,
      }
      if (!isRecurringTaskAccepted(task.id)) {
        const accepted = await acceptRecurringTask(task)
        if (!accepted) return false
      }
      const { task: created, error } = await api.addDailyTaskVerbose(dailyData)
      if (created) {
        setDailyTasks((prev) => {
          const createdSignature = buildRecurringSignature(created)
          const alreadyExists = prev.some(
            (item) =>
              item.userId === created.userId &&
              item.type === "recurrente" &&
              (item.date === todayStr || item.date.startsWith(`${todayStr}T`)) &&
              buildRecurringSignature(item) === createdSignature
          )

          return alreadyExists ? prev : [...prev, created]
        })
        return true
      }

      toast.error(error ?? "Error al activar la tarea")
      return false
    },
    [acceptRecurringTask, isRecurringTaskAccepted, user, todayStr]
  )

  const deactivateRecurringTask = useCallback(
    async (task: RecurringTask) => {
      if (!user) {
        toast.error("No se pudo identificar el usuario")
        return false
      }

      const signature = buildRecurringSignature(task)
      const activatedTask = dailyTasks.find(
        (item) =>
          item.userId === user.id &&
          item.type === "recurrente" &&
          (item.date === todayStr || item.date.startsWith(`${todayStr}T`)) &&
          buildRecurringSignature(item) === signature
      )

      if (!activatedTask) return true

      const deleted = await api.deleteDailyTask(activatedTask.id)
      if (!deleted) {
        toast.error("No se pudo quitar la tarea del dia")
        return false
      }

      setDailyTasks((prev) => prev.filter((item) => item.id !== activatedTask.id))
      return true
    },
    [dailyTasks, todayStr, user]
  )

  const isRecurringActivatedToday = useCallback(
    (taskId: string | number) => {
      const task = allRecurringTasks.find((t) => t.id === taskId)
      if (!task) return false

      const signature = buildRecurringSignature(task)
      return dailyTasks.some(
        (d) =>
          d.userId === user?.id &&
          d.type === "recurrente" &&
          (d.date === todayStr || d.date.startsWith(`${todayStr}T`)) &&
          buildRecurringSignature(d) === signature
      )
    },
    [allRecurringTasks, dailyTasks, todayStr, user?.id]
  )

  // ── Reclamos ────────────────────────────────────────────
  const addClaim = useCallback(
    async (data: ClaimFormValues) => {
      if (!user) {
        toast.error("No se pudo identificar el usuario")
        return false
      }

      const userName = `${user.name} ${user.surname}`
      const { claim: created, error } = await api.createClaimVerbose(user.id, userName, data)
      if (created) {
        setClaims((prev) => [...prev, created])
        saveClaimAuditMeta(user.id, created.id, {
          createdBy: userName,
          createdAt: new Date().toISOString(),
          editHistory: [],
          resolutionHistory: [],
        })
        await fetchDaily()
        return true
      } else {
        toast.error(error ?? "Error al registrar el reclamo")
        return false
      }
    },
    [user, fetchDaily]
  )

  const updateClaim = useCallback(
    async (id: string | number, data: ClaimFormValues) => {
      const updated = await api.updateClaim(id, data)
      if (!updated) {
        toast.error("Error al editar el reclamo")
        return false
      }

      if (user) {
        const userName = `${user.name} ${user.surname}`
        const currentAudit = readClaimAuditCache()[String(id)] ?? {}
        saveClaimAuditMeta(user.id, id, {
          ...currentAudit,
          editedBy: userName,
          editedAt: new Date().toISOString(),
          editHistory: [
            ...(currentAudit.editHistory ?? []),
            { by: userName, at: new Date().toISOString() },
          ],
        })
      }

      setClaims((prev) => prev.map((claim) => (claim.id === id ? updated : claim)))
      await fetchDaily()
      return true
    },
    [fetchDaily, user]
  )

  // ── Trabajos realizados ─────────────────────────────────
  const addCompletedWork = useCallback(
    async (data: CompletedWorkFormValues) => {
      if (!user) return null
      const userName = `${user.name} ${user.surname}`
      const { work: created, error } = await api.createCompletedWorkVerbose(user.id, userName, data)
      if (created) {
        setCompletedWorks((prev) => [...prev, created])
        saveCompletedWorkMeta(user.id, created.id, {
          solution: data.solution?.trim() ?? "",
          timestamp: new Date().toISOString(),
        })
        await fetchDaily()
        return created
      } else {
        toast.error(error ?? "Error al registrar el trabajo")
        return null
      }
    },
    [user, fetchDaily]
  )

  const updateCompletedWork = useCallback(
    async (id: string | number, data: CompletedWorkFormValues) => {
      const { work: updated, error } = await api.updateCompletedWorkVerbose(id, data)
      if (!updated) {
        toast.error(error ?? "Error al editar el trabajo")
        return false
      }

      setCompletedWorks((prev) => prev.map((work) => (work.id === id ? updated : work)))
      await fetchDaily()
      return true
    },
    [fetchDaily]
  )

  return (
    <DataContext.Provider
      value={{
        recurringTasks,
        addRecurringTask,
        acceptRecurringTask,
        removeRecurringTask,
        isRecurringTaskAccepted,
        isRecurringTaskHidden,
        toggleRecurringTaskVisibility,
        loadingRecurring,
        dailyTasks,
        activateRecurringTask,
        deactivateRecurringTask,
        isRecurringActivatedToday,
        loadingDaily,
        claims,
        addClaim,
        updateClaim,
        loadingClaims,
        completedWorks,
        addCompletedWork,
        updateCompletedWork,
        loadingWorks,
        todayStr,
        refreshAll,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error("useData must be used within <DataProvider>")
  return ctx
}
