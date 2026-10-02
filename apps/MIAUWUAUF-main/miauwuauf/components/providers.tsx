"use client"

import { Suspense } from "react"
import { SessionProvider } from "next-auth/react"
import { CartProvider } from "@/app/tienda/context/CartContext"
import { ScrollRestoration } from "@/components/ScrollRestoration"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CartProvider>
        <Suspense fallback={null}>
          <ScrollRestoration />
        </Suspense>
        {children}
      </CartProvider>
    </SessionProvider>
  )
}
