import { createContext } from 'react';

/**
 * トースト（画面上部に少しだけ出て、自動で消えるお知らせ）を出す操作
 * SSAM の ToastContext と同じ使い方：const toast = useToast(); toast.success('保存しました');
 */
export type Toast = {
  success: (message: string) => void;
  error  : (message: string) => void;
};

export const ToastContext = createContext<Toast | null>(null);
