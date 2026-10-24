import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ToastContext, type Toast } from './toastContext';

type ToastType = 'success' | 'error';
type ToastItem = { id: number; type: ToastType; message: string };

// 表示している時間（ミリ秒）
const DURATION_MS = 3000;

// 種類ごとの見た目
const STYLE: Record<ToastType, { icon: string; className: string }> = {
  success: { icon: '✓', className: 'bg-stone-800 text-white' },
  error  : { icon: '!', className: 'bg-red-600 text-white' },
};

let _nextId = 0;

/** トーストを出す仕組みをアプリ全体に配る Provider（SSAM の ToastProvider と同じ役割） */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((type: ToastType, message: string) => {
    const id = ++_nextId;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), DURATION_MS);
  }, []);

  const toast: Toast = useMemo(
    () => ({
      success: (message: string) => show('success', message),
      error  : (message: string) => show('error', message),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* 画面上部の中央に重ねて出す。iPhone のノッチに重ならないよう safe-area の分だけ下げる */}
      <div
        // aria-live：読み上げ機能にも、お知らせが出たことを伝える
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+12px)]"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            role="status"
            className={`animate-toast-in flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold shadow-lg shadow-stone-900/20 ${STYLE[t.type].className}`}
          >
            <span>{STYLE[t.type].icon}</span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
