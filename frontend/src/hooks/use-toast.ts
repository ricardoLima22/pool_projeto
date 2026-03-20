import * as React from "react"

export interface Toast {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactElement
  [key: string]: any
}

export function useToast() {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const toast = React.useCallback((props: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, ...props }])
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, toast, dismiss }
}

export const toast = (props: Omit<Toast, "id">) => {}
