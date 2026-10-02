"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, LogOut } from "lucide-react"
import Link from "next/link"

import { useSession, signOut } from "next-auth/react"

export default function DashboardHeader() {
  const { data: session } = useSession()
  const userEmail = session?.user?.email || "veterinario@miauwuauf.com"

  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.href = "/"
  }

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Dashboard Veterinario</h1>
              <p className="text-sm text-muted-foreground">Sistema de monitoreo MIAUWUAUF</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{userEmail}</span>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
