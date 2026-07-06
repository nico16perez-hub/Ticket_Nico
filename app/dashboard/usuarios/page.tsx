"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { UserManagement } from "@/components/users/user-management"
import { useAuth } from "@/lib/auth-context"
import { isAdmin } from "@/lib/auth"

export default function UsuariosPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAdmin(user)) {
      router.replace("/dashboard")
    }
  }, [user, loading, router])

  if (!isAdmin(user)) return null

  return <UserManagement />
}
