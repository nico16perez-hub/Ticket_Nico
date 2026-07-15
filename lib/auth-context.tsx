"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import CryptoJS from "crypto-js"
import type { User, LoginCredentials } from "@/lib/types"
import { API_URL } from "@/lib/constants"
import {
  getToken,
  storeUser,
  clearAuth,
} from "@/lib/auth"
import * as api from "@/lib/api"

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const SECRET_KEY = process.env.NEXT_PUBLIC_CRYPTO_SECRET!

  const encryptPassword = useCallback((password: string) => {
    const encrypted = CryptoJS.AES.encrypt(password, CryptoJS.enc.Utf8.parse(SECRET_KEY), {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    }).toString();
    return encrypted;
  }, [SECRET_KEY])

  useEffect(() => {
    queueMicrotask(async () => {
      const token = getToken()
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
        const currentUser = await api.getCurrentUser()
        setUser(currentUser)
      } catch {
        clearAuth()
        setUser(null)
      }
      setLoading(false)
    })
  }, [])

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
      try {
        setLoading(true)
        const encryptedPassword = encryptPassword(credentials.password)

        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userName: credentials.userName,
            password: encryptedPassword,
          }),
        })

        if (!res.ok) {
          const errorText = await res.text()
          return { success: false, error: errorText || "Usuario o contrasena incorrectos" }
        }

        const data = await res.json()

        const loggedUser: User = {
          id: data.id,
          name: data.name,
          surname: data.surname,
          userName: data.userName,
          role: data.role,
          area: data.area,
          token: data.token,
        }

        storeUser(loggedUser, credentials.remember)
        setUser(loggedUser)
        setLoading(false)
        return { success: true }
      } catch {
        setLoading(false)
        return { success: false, error: "Error de conexion con el servidor" }
      }
    },
    [encryptPassword]
  )

  const logout = useCallback(() => {
    clearAuth()
    setUser(null)
    window.location.href = "/login"
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>")
  return ctx
}
