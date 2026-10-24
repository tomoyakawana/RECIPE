import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { queryClient } from '../utils/queryClient';
import { supabase } from '../utils/supabaseClient';
import { AuthContext, type AuthState } from './authContext';

/**
 * Supabase のエラーを、画面に出す日本語に変える
 * 細かい理由（メールが違うのか、パスワードが違うのか）はあえて分けない（推測されにくくするため）
 */
const toMessage = (code?: string): string => {
  switch (code) {
    case 'invalid_credentials': return 'メールアドレスかパスワードが違います';
    case 'email_not_confirmed': return 'メールアドレスの確認が済んでいません';
    default                   : return 'ログインできませんでした。時間をおいてもう一度お試しください';
  }
};

/** ログイン状態をアプリ全体に配る Provider（SSAM の AuthContext と同じ役割） */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 起動時：前回のログイン状態を読み込む
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // ログイン・ログアウト・トークンの自動更新のたびに呼ばれる
    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      // ログアウトしたら、読み込んだデータを捨てる（同じ端末で別の人がログインしたときに、前の人のデータを見せない）
      if (event === 'SIGNED_OUT') queryClient.clear();
    });

    // 画面が消えるときに購読をやめる（やめないと二重に呼ばれ続ける）
    return () => data.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? toMessage(error.code) : null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value: AuthState = useMemo(
    () => ({ session, loading, signIn, signOut }),
    [session, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
