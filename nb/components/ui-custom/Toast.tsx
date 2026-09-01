"use client";

import { toast } from "sonner";
import { useCallback } from "react";

// Legacy types for compatibility
type ToastType = "success" | "error" | "info" | "warning";

// Legacy interface (simplified for shim)
interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number, action?: { label: string, onClick: () => void }) => void;
  hideToast: (id: string) => void;
}

// Hook that maintains the exact same signature as before
export function useToast(): ToastContextType {
  const showToast = useCallback((message: string, type: ToastType = "info", duration: number = 5000, action?: { label: string, onClick: () => void }) => {
    const options: any = {
      duration,
    };

    if (action) {
      options.action = {
        label: action.label,
        onClick: action.onClick,
      };
    }

    switch (type) {
      case "success":
        toast.success(message, options);
        break;
      case "error":
        toast.error(message, options);
        break;
      case "warning":
        toast.warning(message, options);
        break;
      case "info":
      default:
        toast.info(message, options);
        break;
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    toast.dismiss(id);
  }, []);

  return { showToast, hideToast };
}

// Re-export Toaster from shadcn/ui/sonner implementation (or direct wrapper)
// We need to ensure we import the one we verified exists: components/ui/sonner.tsx
// But typically for this file acting as "Toast.tsx", we might just export a provider stub if needed, 
// OR we can just instruct users to use <Toaster /> from ui/sonner in layout.
// For now, let's export a Null Provider to avoid breaking layout imports immediately, 
// or better, just export the real Toaster here if we want to change layout import to point to this file?
// The user plan says: "Replace ToastProvider in app/layout.tsx with Sonner Toaster".
// So existing ToastProvider imports in layout will be removed/replaced.
// However, if other components imported ToastProvider, we should be careful.
// Let's check grep results... mostly useToast usages.
// layout.tsx was the main user of ToastProvider.

// We'll export a ToastProvider that just renders children, effectively doing nothing,
// in case some deeply nested component uses it (unlikely but safe).
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}



