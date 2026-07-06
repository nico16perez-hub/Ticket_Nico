"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { isAdmin } from "@/lib/auth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  LayoutDashboard,
  RefreshCw,
  AlertTriangle,
  Wrench,
  BarChart3,
  Users,
  LogOut,
} from "lucide-react"

const NAV_ITEMS = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Tareas Recurrentes",
    href: "/dashboard/tareas-recurrentes",
    icon: RefreshCw,
  },
  {
    title: "Nuevo Reclamo",
    href: "/dashboard/nuevo-reclamo",
    icon: AlertTriangle,
  },
  {
    title: "Trabajos Realizados",
    href: "/dashboard/trabajos-realizados",
    icon: Wrench,
  },
]

const ADMIN_ITEMS = [
  {
    title: "Informes",
    href: "/dashboard/informes",
    icon: BarChart3,
  },
  {
    title: "Usuarios",
    href: "/dashboard/usuarios",
    icon: Users,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <span className="text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            Sistema de registro de tareas
          </span>
        </Link>
      </SidebarHeader>

      <Separator className="bg-sidebar-border" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegacion</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin(user) && (
          <SidebarGroup>
            <SidebarGroupLabel>Administracion</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {ADMIN_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex flex-col gap-2 group-data-[collapsible=icon]:items-center">
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium text-sidebar-foreground">
              {user?.name} {user?.surname}
            </p>
            <p className="text-xs text-muted-foreground">{user?.area}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">Cerrar sesion</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
