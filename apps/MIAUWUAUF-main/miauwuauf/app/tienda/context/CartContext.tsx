"use client"
import React, { createContext, useContext, useState, useEffect, useTransition } from "react"
import { toast } from "sonner"
import { TiendaProducto, CartItem } from "@/lib/admin-service"

function normalizeStock(raw: unknown): number {
  const n = Math.floor(Number(raw))
  return Number.isFinite(n) && n > 0 ? n : 0
}

interface CartContextType {
  cart: CartItem[]
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>
  cartCount: number
  cartTotal: number
  isCartOpen: boolean
  setIsCartOpen: (open: boolean) => void
  addToCart: (product: TiendaProducto, quantity?: number) => void
  removeFromCart: (productId: string | number) => void
  updateQuantity: (productId: string | number, change: number, productStock?: number) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

/** Alinea el carrito con el stock real del catálogo y elimina productos inexistentes. */
function reconcileCartWithCatalog(
  cart: CartItem[],
  products: TiendaProducto[],
): { next: CartItem[]; adjusted: boolean } {
  const stockById = new Map<string, number>()
  for (const p of products) {
    stockById.set(String(p.id), normalizeStock(p.stock))
  }

  let adjusted = false
  const next: CartItem[] = []

  for (const item of cart) {
    const sid = String(item.id)
    const freshStock = stockById.get(sid)
    if (freshStock === undefined) {
      adjusted = true
      continue
    }
    const q = Math.min(item.quantity, freshStock)
    if (q <= 0) {
      adjusted = true
      continue
    }
    if (q !== item.quantity || freshStock !== normalizeStock(item.stock)) {
      adjusted = true
    }
    next.push({ ...item, stock: freshStock, quantity: q })
  }

  return { next, adjusted }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    cart: CartItem[]
    isMounted: boolean
  }>({
    cart: [],
    isMounted: false,
  })
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [, startTransition] = useTransition()

  const { cart, isMounted } = state

  const updateCart: React.Dispatch<React.SetStateAction<CartItem[]>> = (newCartAction) => {
    setState((prev) => {
      const nextCart =
        typeof newCartAction === "function"
          ? (newCartAction as (prev: CartItem[]) => CartItem[])(prev.cart)
          : newCartAction
      return { ...prev, cart: nextCart }
    })
  }

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      let parsed: CartItem[] = []
      try {
        const savedCart = localStorage.getItem("miauwuauf_cart")
        parsed = savedCart ? JSON.parse(savedCart) : []
        if (!Array.isArray(parsed)) parsed = []
      } catch (e) {
        console.error("Error loading cart from localStorage", e)
        parsed = []
      }

      try {
        const res = await fetch("/api/products", { cache: "no-store" })
        if (!res.ok) throw new Error("products fetch failed")
        const products: TiendaProducto[] = await res.json()
        if (cancelled) return

        const { next, adjusted } = reconcileCartWithCatalog(parsed, products)

        startTransition(() => {
          setState({ cart: next, isMounted: true })
        })
        if (adjusted) {
          const nextIds = new Set(next.map((i) => String(i.id)))
          const anyRemoved = parsed.some((i) => !nextIds.has(String(i.id)))
          if (anyRemoved) {
            toast.info("Algunos productos ya no están disponibles y se quitaron de tu carrito.", {
              duration: 4500,
            })
          } else {
            toast.info("Ajustamos las cantidades según el stock disponible.", { duration: 4000 })
          }
        }
      } catch {
        if (cancelled) return
        startTransition(() => {
          setState({ cart: parsed, isMounted: true })
        })
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("miauwuauf_cart", JSON.stringify(cart))
    }
  }, [cart, isMounted])

  const addToCart = (product: TiendaProducto, quantity: number = 1) => {
    const stock = normalizeStock(product.stock)
    if (stock <= 0) {
      toast.error("Este producto no tiene stock disponible.")
      return
    }

    const toAdd = Math.max(1, Math.floor(quantity))

    updateCart((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        const cap = normalizeStock(product.stock)
        const desired = existing.quantity + toAdd
        const merged = Math.min(desired, cap)
        if (merged < desired) {
          toast.info("Stock máximo alcanzado para este producto.", { duration: 3000 })
        }
        if (merged === existing.quantity) return prev
        return prev.map((item) =>
          item.id === product.id ? { ...item, ...product, stock: cap, quantity: merged } : item,
        )
      }

      const initialQty = Math.min(toAdd, stock)
      if (initialQty < toAdd) {
        toast.info("Solo hay unidades limitadas; se agregó el máximo disponible.", {
          duration: 3500,
        })
      }
      return [...prev, { ...product, stock, quantity: initialQty }]
    })
    setIsCartOpen(true)
  }

  const removeFromCart = (productId: string | number) => {
    updateCart((prev) => prev.filter((item) => item.id !== productId))
  }

  const updateQuantity = (productId: string | number, change: number, productStock?: number) => {
    updateCart((prev) => {
      const next = prev
        .map((item) => {
          if (item.id !== productId) return item

          const cap =
            productStock !== undefined
              ? normalizeStock(productStock)
              : normalizeStock(item.stock)

          if (cap <= 0) {
            return { ...item, quantity: 0 }
          }

          let q = item.quantity + change
          q = Math.max(1, q)
          q = Math.min(q, cap)
          return { ...item, stock: cap, quantity: q }
        })
        .filter((item) => item.quantity > 0)

      return next
    })
  }

  const clearCart = () => {
    updateCart([])
    localStorage.removeItem("miauwuauf_cart")
  }

  const cartTotal = cart.reduce(
    (total, item) =>
      total + item.precio * (1 - (item.descuento || 0) / 100) * item.quantity,
    0,
  )
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        cart,
        setCart: updateCart,
        cartCount,
        cartTotal,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
