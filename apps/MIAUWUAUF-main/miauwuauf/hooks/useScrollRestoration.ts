"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"

const STORAGE_PREFIX = "miauwuauf:scroll:"

function storageKey(pathname: string, search: string) {
  const q = search.trim()
  return `${STORAGE_PREFIX}${pathname}${q ? `?${q}` : ""}`
}

function flushScroll(pathname: string, search: string) {
  try {
    sessionStorage.setItem(storageKey(pathname, search), String(window.scrollY))
  } catch {
    // ignore private mode / quota
  }
}

function readSavedScroll(fullKey: string): number | null {
  try {
    const raw = sessionStorage.getItem(fullKey)
    if (raw == null) return null
    const y = parseInt(raw, 10)
    return Number.isNaN(y) ? null : y
  } catch {
    return null
  }
}

function restoreScrollWithRetries(y: number) {
  const maxY = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
  const apply = () => window.scrollTo(0, Math.min(y, maxY()))

  apply()
  requestAnimationFrame(apply)
  requestAnimationFrame(() => requestAnimationFrame(apply))

  let attempts = 0
  const maxAttempts = 14
  const timer = window.setInterval(() => {
    attempts += 1
    apply()
    if (attempts >= maxAttempts) {
      window.clearInterval(timer)
    }
  }, 80)
}

export function useScrollRestoration() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams?.toString() ?? ""
  const fullKey = storageKey(pathname, search)

  const pathnameRef = useRef(pathname)
  const searchRef = useRef(search)
  pathnameRef.current = pathname
  searchRef.current = search

  const prevRef = useRef<{ pathname: string; search: string } | null>(null)
  const backNavRef = useRef(false)

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual"
    }
  }, [])

  useEffect(() => {
    const onPopState = () => {
      backNavRef.current = true
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  useEffect(() => {
    const willLeaveForInternalUrl = (targetUrl: string): boolean => {
      try {
        const next = new URL(targetUrl, window.location.origin)
        if (next.origin !== window.location.origin) return false
        const curPath = pathnameRef.current
        const curSearch = searchRef.current
        const nextPath = next.pathname
        const nextSearch = next.search.replace(/^\?/, "")
        if (nextPath === curPath && nextSearch === curSearch) return false
        return true
      } catch {
        return false
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.("a[href]")
      if (!el || !(el instanceof HTMLAnchorElement)) return
      const href = el.getAttribute("href")
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return
      if (el.target === "_blank" || el.download) return
      if (el.hasAttribute("data-no-scroll-save")) return
      if (!willLeaveForInternalUrl(el.href)) return
      flushScroll(pathnameRef.current, searchRef.current)
    }

    document.addEventListener("pointerdown", onPointerDown, true)
    return () => document.removeEventListener("pointerdown", onPointerDown, true)
  }, [])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        flushScroll(pathnameRef.current, searchRef.current)
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [])

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => flushScroll(pathname, search))
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [pathname, search])

  useEffect(() => {
    const prev = prevRef.current
    const pathnameChanged = prev != null && prev.pathname !== pathname

    const applyScroll = () => {
      if (backNavRef.current) {
        backNavRef.current = false
        const saved = readSavedScroll(fullKey)
        if (saved != null) {
          restoreScrollWithRetries(saved)
          return
        }
        window.scrollTo(0, 0)
        return
      }

      if (pathnameChanged) {
        const hash = window.location.hash
        if (hash.length > 1) {
          const id = decodeURIComponent(hash.slice(1))
          const el = document.getElementById(id)
          if (el) {
            el.scrollIntoView({ behavior: "auto", block: "start" })
            return
          }
        }
        // Si ya visitó esta ruta antes, conserva su última posición guardada.
        const saved = readSavedScroll(fullKey)
        if (saved != null) {
          restoreScrollWithRetries(saved)
          return
        }

        window.scrollTo(0, 0)
      }
    }

    prevRef.current = { pathname, search }
    requestAnimationFrame(() => {
      requestAnimationFrame(applyScroll)
    })
  }, [pathname, search, fullKey])

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return
      const saved = readSavedScroll(fullKey)
      if (saved != null) {
        restoreScrollWithRetries(saved)
      }
    }
    window.addEventListener("pageshow", onPageShow)
    return () => window.removeEventListener("pageshow", onPageShow)
  }, [fullKey])
}

