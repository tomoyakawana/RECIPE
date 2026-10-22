import { useContext } from 'react';
import { ToastContext, type Toast } from '../contexts/toastContext';

/** トーストを出す。ToastProvider の内側で使うこと */
export const useToast = (): Toast => {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error('useToast は ToastProvider の内側で使ってください');
  return toast;
};
