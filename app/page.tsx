"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getStoredUser } from "@/lib/auth"

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const user = getStoredUser()
    if (user) {
      router.replace("/dashboard")
    } else {
      router.replace("/login")
    }
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}
