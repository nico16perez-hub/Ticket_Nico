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
import { format } from "date-fns"
import * as api from "@/lib/api"
import { toast } from "sonner"

interface DataContextValue {
  // Tareas recurrentes
  recurringTasks: RecurringTask[]
  addRecurringTask: (data: RecurringTaskFormValues) => Promise<boolean>
  removeRecurringTask: (id: number) => Promise<boolean>
  isRecurringTaskHidden: (taskId: number) => boolean
  toggleRecurringTaskVisibility: (id: number) => Promise<boolean>
  loadingRecurring: boolean

  // Tareas del dia
  dailyTasks: DailyTask[]
  activateRecurringTask: (task: RecurringTask) => Promise<void>
  isRecurringActivatedToday: (taskId: number) => boolean
  loadingDaily: boolean

  // Reclamos
  claims: Claim[]
  addClaim: (data: ClaimFormValues) => Promise<void>
  updateClaim: (id: string | number, data: ClaimFormValues) => Promise<boolean>
  loadingClaims: boolean

  // Trabajos realizados
  completedWorks: CompletedWork[]
  addCompletedWork: (data: CompletedWorkFormValues) => Promise<void>
  updateCompletedWork: (id: number, data: CompletedWorkFormValues) => Promise<boolean>
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
      const users = await api.getUsers()
      const userIds = new Set<number>([user.id])

      for (const item of users) {
        if (typeof item.id === "number") {
          userIds.add(item.id)
        }
      }

      const data = (
        await Promise.all(Array.from(userIds).map((userId) => api.getRecurringTasks(userId)))
      ).flat()
      const uniqueTasks = uniqueRecurringTasks(data)
      const hidden = readHiddenRecurringTasks(user.id)

      setAllRecurringTasks(uniqueTasks)
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
    const data = await api.getDashboardToday(todayStr)
    const recurringAsDaily = (data?.recurringTasks ?? []).map((task) => ({
      id: task.id,
      userId: task.userId,
      userName: task.userName,
      date: data?.date ?? todayStr,
      type: "recurrente" as const,
      title: task.title,
      description: task.description,
    }))
    setDailyTasks(recurringAsDaily)
    setClaims(data?.claims ?? [])
    setCompletedWorks(data?.completedWorks ?? [])
    setLoadingDaily(false)
  }, [user, todayStr])

  const refreshAll = useCallback(async () => {
    setLoadingDaily(true)
    setLoadingClaims(true)
    setLoadingWorks(true)

    const [, dashboard] = await Promise.all([
      fetchRecurring(),
      user ? api.getDashboardToday(todayStr) : Promise.resolve(null),
    ])

    const recurringAsDaily = (dashboard?.recurringTasks ?? []).map((task) => ({
      id: task.id,
      userId: task.userId,
      userName: task.userName,
      date: dashboard?.date ?? todayStr,
      type: "recurrente" as const,
      title: task.title,
      description: task.description,
    }))
    setDailyTasks(recurringAsDaily)
    setClaims(dashboard?.claims ?? [])
    setCompletedWorks(dashboard?.completedWorks ?? [])

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
        setRecurringTasks([])
      }
      resetState()
      return
    }

    const loadHiddenState = async () => {
      const hidden = readHiddenRecurringTasks(user.id)
      setHiddenRecurringTasks(hidden)
      setRecurringTasks((prev) =>
        prev.filter((task) => !hidden.has(buildRecurringSignature(task)))
      )
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

      if (existingTask) {
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

      const created = await api.createRecurringTask(user.id, data)
      if (created) {
        await fetchRecurring()
        toast.success("Tarea recurrente guardada")
        return true
      }

      toast.error("Error al guardar la tarea recurrente")
      return false
    },
    [allRecurringTasks, fetchRecurring, hiddenRecurringTasks, user]
  )

  const removeRecurringTask = useCallback(async (id: number) => {
    const task = allRecurringTasks.find((item) => item.id === id)
    if (!task || !user) {
      toast.error("No se pudo identificar la tarea recurrente")
      return false
    }

    const signature = buildRecurringSignature(task)
    const nextHiddenTasks = new Set(hiddenRecurringTasks)
    nextHiddenTasks.add(signature)
    setHiddenRecurringTasks(nextHiddenTasks)
    saveHiddenRecurringTasks(user.id, nextHiddenTasks)
    return true
  }, [allRecurringTasks, hiddenRecurringTasks, user])

  const isRecurringTaskHidden = useCallback(
    (taskId: number) => {
      const task = allRecurringTasks.find((item) => item.id === taskId)
      if (!task) return false
      return hiddenRecurringTasks.has(buildRecurringSignature(task))
    },
    [allRecurringTasks, hiddenRecurringTasks]
  )

  const toggleRecurringTaskVisibility = useCallback(
    async (id: number) => {
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
      if (!user) return
      const dailyData = {
        userId: user.id,
        userName: `${user.name} ${user.surname}`,
        date: todayStr,
        type: "recurrente" as const,
        title: task.title,
        description: task.description,
      }
      const created = await api.addDailyTask(dailyData)
      if (created) {
        setDailyTasks((prev) => [...prev, created])
      } else {
        toast.error("Error al activar la tarea")
      }
    },
    [user, todayStr]
  )

  const isRecurringActivatedToday = useCallback(
    (taskId: number) => {
      const task = allRecurringTasks.find((t) => t.id === taskId)
      if (!task) return false

      const signature = buildRecurringSignature(task)
      return dailyTasks.some(
        (d) =>
          d.type === "recurrente" &&
          d.date === todayStr &&
          buildRecurringSignature(d) === signature
      )
    },
    [allRecurringTasks, dailyTasks, todayStr]
  )

  // ── Reclamos ────────────────────────────────────────────
  const addClaim = useCallback(
    async (data: ClaimFormValues) => {
      if (!user) return
      const userName = `${user.name} ${user.surname}`
      const created = await api.createClaim(user.id, userName, data)
      if (created) {
        setClaims((prev) => [...prev, created])
        await fetchDaily()
      } else {
        toast.error("Error al registrar el reclamo")
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

      setClaims((prev) => prev.map((claim) => (claim.id === id ? updated : claim)))
      await fetchDaily()
      return true
    },
    [fetchDaily]
  )

  // ── Trabajos realizados ─────────────────────────────────
  const addCompletedWork = useCallback(
    async (data: CompletedWorkFormValues) => {
      if (!user) return
      const userName = `${user.name} ${user.surname}`
      const created = await api.createCompletedWork(user.id, userName, data)
      if (created) {
        setCompletedWorks((prev) => [...prev, created])
        await fetchDaily()
      } else {
        toast.error("Error al registrar el trabajo")
      }
    },
    [user, fetchDaily]
  )

  const updateCompletedWork = useCallback(
    async (id: number, data: CompletedWorkFormValues) => {
      const updated = await api.updateCompletedWork(id, data)
      if (!updated) {
        toast.error("Error al editar el trabajo")
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
        removeRecurringTask,
        isRecurringTaskHidden,
        toggleRecurringTaskVisibility,
        loadingRecurring,
        dailyTasks,
        activateRecurringTask,
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
