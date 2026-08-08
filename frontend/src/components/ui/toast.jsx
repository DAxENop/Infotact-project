import { useState, useCallback, createContext, useContext } from "react";
import { X, CheckCircle, AlertCircle } from "lucide-react";

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg animate-in slide-in-from-right ${
              toast.type === "error"
                ? "bg-destructive/10 border-destructive/20 text-destructive"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
          >
            {toast.type === "error" ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle className="h-4 w-4 shrink-0" />}
            <span className="text-sm">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="ml-2 opacity-70 hover:opacity-100 cursor-pointer"><X className="h-3 w-3" /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
