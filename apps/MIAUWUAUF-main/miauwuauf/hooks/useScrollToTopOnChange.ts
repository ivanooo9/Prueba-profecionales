"use client"

import { useEffect, useRef } from "react"

export function useScrollToTopOnChange(dependency: unknown, skipInitial = true) {
  const didRunRef = useRef(false)

  useEffect(() => {
    if (skipInitial && !didRunRef.current) {
      didRunRef.current = true
      return
    }

    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
  }, [dependency, skipInitial])
}

