import { useEffect, useMemo, useState } from "react"

type ToastVariant = "success" | "error" | "warning"

interface ToastProps {
  show: boolean
  variant: ToastVariant
  title: string
  message?: string
  onClose?: () => void
  /** Auto-dismiss after ms (0 = no auto-dismiss). Default: 7500 for all variants */
  duration?: number
}

const config: Record<ToastVariant, {
  bg: string
  subtitleColor: string
  hoverBg: string
  icon: JSX.Element
  position: string
  animation: string
}> = {
  success: {
    bg: "bg-green-600",
    subtitleColor: "text-green-100",
    hoverBg: "hover:bg-green-700",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    position: "top-4 left-1/2 -translate-x-1/2",
    animation: "animate-in slide-in-from-top",
  },
  error: {
    bg: "bg-red-500",
    subtitleColor: "text-red-100",
    hoverBg: "hover:bg-red-600",
    icon: (
      <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    position: "top-4 left-1/2 -translate-x-1/2",
    animation: "animate-in slide-in-from-top",
  },
  warning: {
    bg: "bg-amber-500",
    subtitleColor: "text-amber-100",
    hoverBg: "hover:bg-amber-600",
    icon: (
      <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    position: "top-4 left-1/2 -translate-x-1/2",
    animation: "animate-in slide-in-from-top",
  },
}

export function Toast({ show, variant, title, message, onClose, duration }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false)

  const autoDismiss = duration ?? 7500
  const exitDelay = useMemo(() => {
    if (!autoDismiss || autoDismiss <= 0) return 0
    if (autoDismiss <= 2000) return Math.max(300, autoDismiss - 300)
    if (autoDismiss <= 5000) return Math.max(1000, autoDismiss - 1000)
    return 5000
  }, [autoDismiss])

  useEffect(() => {
    if (!show) {
      setIsExiting(false)
    }
  }, [show])

  useEffect(() => {
    if (!show || !autoDismiss || !onClose) return

    const exitTimer = setTimeout(() => setIsExiting(true), exitDelay)
    const closeTimer = setTimeout(onClose, autoDismiss)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(closeTimer)
    }
  }, [show, autoDismiss, exitDelay, onClose])

  if (!show) return null

  const c = config[variant]
  const exitStyle = isExiting
    ? {
        opacity: 0,
        transform: "translateY(8px) scale(0.985)",
      }
    : {
        opacity: 1,
        transform: "translateY(0px) scale(1)",
      }

  return (
    <div className={`fixed ${c.position} z-50 ${c.animation}`}>
      <div
        className={`${c.bg} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 max-w-md`}
        style={{
          ...exitStyle,
          transition: "opacity 2200ms ease, transform 2200ms ease",
          willChange: "opacity, transform",
        }}
      >
        {c.icon}
        <div className="flex-1">
          <p className="font-semibold">{title}</p>
          {message && <p className={`text-sm ${c.subtitleColor}`}>{message}</p>}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`text-white ${c.hoverBg} p-1 rounded transition-colors`}
            aria-label="Zatvoriť"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
