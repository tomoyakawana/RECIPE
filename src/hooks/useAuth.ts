import { useContext } from 'react';
import { AuthContext, type AuthState } from '../contexts/authContext';

/** ログイン状態と操作を取り出す。AuthProvider の内側で使うこと */
export const useAuth = (): AuthState => {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth は AuthProvider の内側で使ってください');
  return auth;
};
