import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';

/**
 * ログインしていないと入れない画面を囲む部品（SSAM の PrivateRoute と同じ役割）
 * 未ログインなら /login へ移し、ログイン後に元の画面へ戻れるよう、元の場所を渡しておく
 *
 * ※ これは画面の出し分けだけ。データそのものは DB の RLS が守っている
 */
const RequireAuth = () => {
  const { session, loading } = useAuth();
  const location = useLocation();

  // ログイン状態の読み込み中は何も出さない（一瞬ログイン画面が見えるのを防ぐ）
  if (loading) return <div className="min-h-dvh" />;

  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return <Outlet />;
};

export default RequireAuth;
