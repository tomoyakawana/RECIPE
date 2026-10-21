import type { Session } from '@supabase/supabase-js';
import { createContext } from 'react';

/** ログイン状態と、ログイン・ログアウトの操作 */
export type AuthState = {
  // ログイン中なら Session、未ログインなら null
  session: Session | null;
  // 起動直後、保存済みのログイン状態を読み込んでいる間は true（この間は画面を出さない）
  loading: boolean;
  // 成功なら null、失敗なら画面に出すエラーメッセージを返す
  signIn : (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthState | null>(null);
