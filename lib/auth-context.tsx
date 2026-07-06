"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import CryptoJS from "crypto-js"
import type { User, LoginCredentials } from "@/lib/types"
import { API_URL } from "@/lib/constants"
import {
  getStoredUser,
  storeUser,
  clearAuth,
} from "@/lib/auth"

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser())
  const [loading, setLoading] = useState(false)

  const SECRET_KEY = process.env.NEXT_PUBLIC_CRYPTO_SECRET!

  const encryptPassword = useCallback((password: string) => {
    const encrypted = CryptoJS.AES.encrypt(password, CryptoJS.enc.Utf8.parse(SECRET_KEY), {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    }).toString();
    return encrypted;
  }, [SECRET_KEY])

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
      try {
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
        return { success: true }
      } catch {
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
