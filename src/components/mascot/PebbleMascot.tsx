import { useEffect, useMemo, useRef, useState } from 'react'

export type MascotContextData = {
  phase: string
  runStatus: string
  nudgeVisible: boolean
  guidedStep?: { current: number; total: number }
  isAfk: boolean
  demoMode: boolean
}

const STORAGE_KEY = 'pebble_mascot_position_v1'
const MASCOT_SIZE = 58
const VIEWPORT_PADDING = 16
const DEFAULT_RIGHT_INSET = 88
const DEFAULT_BOTTOM_INSET = 108

type Position = { x: number; y: number }

function clampPosition(position: Position) {
  if (typeof window === 'undefined') {
    return position
  }

  return {
    x: Math.min(
      Math.max(position.x, VIEWPORT_PADDING),
      window.innerWidth - MASCOT_SIZE - VIEWPORT_PADDING,
    ),
    y: Math.min(
      Math.max(position.y, VIEWPORT_PADDING),
      window.innerHeight - MASCOT_SIZE - VIEWPORT_PADDING,
    ),
  }
}

function defaultPosition(): Position {
  if (typeof window === 'undefined') {
    return { x: VIEWPORT_PADDING, y: VIEWPORT_PADDING }
  }

  return clampPosition({
    x: window.innerWidth - MASCOT_SIZE - DEFAULT_RIGHT_INSET,
    y: window.innerHeight - MASCOT_SIZE - DEFAULT_BOTTOM_INSET,
  })
}

function getStoredPosition() {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Position>
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') {
      return null
    }
    return clampPosition({ x: parsed.x, y: parsed.y })
  } catch {
    return null
  }
}

function persistPosition(position: Position) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(position))
}

export function PebbleMascot({ data }: { data: MascotContextData }) {
  const [expanded, setExpanded] = useState(false)
  const [position, setPosition] = useState<Position>(() => getStoredPosition() ?? defaultPosition())
  const dragRef = useRef<{
    active: boolean
    pointerId: number
    origin: Position
    start: Position
    moved: boolean
  } | null>(null)

  useEffect(() => {
    const onResize = () => {
      setPosition((prev) => clampPosition(prev))
    }

    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const alignCardRight = useMemo(() => {
    if (typeof window === 'undefined') {
      return true
    }
    return position.x > window.innerWidth / 2
  }, [position.x])

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      origin: { x: event.clientX, y: event.clientY },
      start: position,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragRef.current || !dragRef.current.active || dragRef.current.pointerId !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - dragRef.current.origin.x
    const deltaY = event.clientY - dragRef.current.origin.y

    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      dragRef.current.moved = true
    }

    setPosition(
      clampPosition({
        x: dragRef.current.start.x + deltaX,
        y: dragRef.current.start.y + deltaY,
      }),
    )
  }

  function onPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) {
      return
    }

    const dragged = dragRef.current.moved
    dragRef.current.active = false
    event.currentTarget.releasePointerCapture(event.pointerId)
    dragRef.current = null

    setPosition((prev) => {
      const next = clampPosition(prev)
      persistPosition(next)
      return next
    })

    if (!dragged) {
      setExpanded((prev) => !prev)
    }
  }

  return (
    <div
      className="fixed z-[74]"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex h-[58px] w-[58px] items-center justify-center rounded-full border border-pebble-accent/35 bg-pebble-panel/95 text-lg shadow-[0_16px_28px_rgba(2,8,23,0.38)] backdrop-blur-md transition hover:border-pebble-accent/50"
        style={{ touchAction: 'none', cursor: 'grab' }}
        aria-label="Toggle Pebble mascot"
      >
        ●
      </button>

      {expanded && (
        <div
          className="absolute bottom-[70px] w-[270px] rounded-xl border border-pebble-border/40 bg-pebble-panel/95 p-3 shadow-[0_18px_34px_rgba(2,8,23,0.42)] backdrop-blur-xl"
          style={alignCardRight ? { right: 0 } : { left: 0 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.05em] text-pebble-text-muted">
            Pebble status
          </p>
          <p className="mt-2 text-sm text-pebble-text-primary">
            Phase: <span className="font-medium">{data.phase}</span>
          </p>
          <p className="text-sm text-pebble-text-primary">
            Run: <span className="font-medium">{data.runStatus}</span>
          </p>
          {data.guidedStep && (
            <p className="mt-1 text-xs text-pebble-text-secondary">
              Guided fix active: Step {data.guidedStep.current} / {data.guidedStep.total}
            </p>
          )}
          {data.nudgeVisible && (
            <p className="mt-1 text-xs text-pebble-text-secondary">
              Nudge ready. “Show me” opens guided recovery.
            </p>
          )}
          {data.isAfk && (
            <p className="mt-1 text-xs text-pebble-text-secondary">Paused while you're away.</p>
          )}
          {data.demoMode && (
            <p className="mt-1 text-xs text-pebble-text-muted">Demo mode active.</p>
          )}
        </div>
      )}
    </div>
  )
}
