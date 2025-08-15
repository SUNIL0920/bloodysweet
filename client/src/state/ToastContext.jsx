import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)

let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const push = useCallback((toast) => {
    const id = ++idCounter
    const entry = { id, type: toast.type || 'info', title: toast.title, message: toast.message }
    setToasts((t) => [...t, entry])
    setTimeout(() => remove(id), toast.durationMs || 3500)
  }, [remove])

  const api = useMemo(() => ({
    info: (msg, title = 'Info') => push({ type: 'info', title, message: msg }),
    success: (msg, title = 'Success') => push({ type: 'success', title, message: msg }),
    error: (msg, title = 'Error') => push({ type: 'error', title, message: msg }),
  }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[2000] space-y-2">
        {toasts.map(t => (
          <div key={t.id} className={`rounded-xl px-4 py-3 shadow-xl border backdrop-blur-md ${t.type==='success'?'bg-emerald-600/90 border-emerald-300/30 text-white': t.type==='error'?'bg-red-600/90 border-red-300/30 text-white':'bg-slate-800/90 border-white/10 text-white'}`}>
            {t.title && <div className="text-xs opacity-90">{t.title}</div>}
            <div className="text-sm font-medium">{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)


