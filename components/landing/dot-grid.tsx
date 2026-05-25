'use client'

import { useCallback, useEffect, useRef } from 'react'

interface DotGridProps {
  className?: string
  dotColor?: string
  dotSize?: number
  gap?: number
  mouseRadius?: number
  mouseStrength?: number
}

export function DotGrid({
  className = '',
  dotColor = 'rgba(255,255,255,0.15)',
  dotSize = 1.2,
  gap = 32,
  mouseRadius = 120,
  mouseStrength = 0.6,
}: DotGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const rafRef = useRef<number>(0)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.scale(dpr, dpr)
    }

    ctx.clearRect(0, 0, w, h)

    const mx = mouseRef.current.x
    const my = mouseRef.current.y

    for (let x = gap / 2; x < w; x += gap) {
      for (let y = gap / 2; y < h; y += gap) {
        const dx = x - mx
        const dy = y - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        const influence = Math.max(0, 1 - dist / mouseRadius)
        const scale = 1 + influence * mouseStrength * 2
        const alpha = 0.12 + influence * 0.55

        ctx.beginPath()
        ctx.arc(x, y, dotSize * scale, 0, Math.PI * 2)
        ctx.fillStyle = dotColor.replace(/[\d.]+\)$/, `${alpha})`)
        ctx.fill()
      }
    }

    rafRef.current = requestAnimationFrame(() => draw())
  }, [dotColor, dotSize, gap, mouseRadius, mouseStrength])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const handleLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 }
    }

    canvas.addEventListener('mousemove', handleMove)
    canvas.addEventListener('mouseleave', handleLeave)
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      canvas.removeEventListener('mousemove', handleMove)
      canvas.removeEventListener('mouseleave', handleLeave)
      cancelAnimationFrame(rafRef.current)
    }
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ pointerEvents: 'auto' }}
    />
  )
}
