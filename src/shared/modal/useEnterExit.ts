import { useEffect, useState } from 'react'

/**
 * Mount/unmount + enter/exit animation lifecycle for overlays.
 * Returns `mounted` (whether the component should be in the DOM) and
 * `visible` (whether the "open" transform/opacity should be applied).
 *
 * After mount, waits two animation frames before flipping `visible` so the
 * initial off-screen state paints first — otherwise the browser collapses
 * both states into one frame and the transition never runs.
 */
export function useEnterExit(open: boolean, animMs: number) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
    } else {
      setVisible(false)
      const id = setTimeout(() => setMounted(false), animMs)
      return () => clearTimeout(id)
    }
  }, [open, animMs])

  useEffect(() => {
    if (!mounted || !open) return
    let raf2: number | undefined
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setVisible(true))
    })
    return () => {
      cancelAnimationFrame(raf1)
      if (raf2) cancelAnimationFrame(raf2)
    }
  }, [mounted, open])

  return { mounted, visible }
}
