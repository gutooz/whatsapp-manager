'use client';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@radix-ui/react-toast';
import { cn } from '@/lib/utils';
import { create } from 'zustand';

interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (t: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (t) =>
    set((s) => ({ toasts: [...s.toasts, { ...t, id: Math.random().toString(36) }] })),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(opts: Omit<ToastItem, 'id'>) {
  useToastStore.getState().addToast(opts);
}

export function Toaster() {
  const { toasts, removeToast } = useToastStore();

  return (
    <ToastProvider>
      {toasts.map((t) => (
        <Toast
          key={t.id}
          onOpenChange={(open) => { if (!open) removeToast(t.id); }}
          className={cn(
            'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all',
            'bg-wm-sidebar border-border',
            t.variant === 'destructive' && 'border-destructive bg-destructive text-white',
          )}
        >
          <div className="grid gap-1">
            {t.title && <ToastTitle className="text-sm font-semibold">{t.title}</ToastTitle>}
            {t.description && <ToastDescription className="text-sm opacity-90">{t.description}</ToastDescription>}
          </div>
          <ToastClose className="absolute right-2 top-2 rounded-md p-1 opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100" />
        </Toast>
      ))}
      <ToastViewport className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]" />
    </ToastProvider>
  );
}
