import { useState, type SubmitEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';

// 入力欄の共通スタイル（iOS の自動ズームを避けるため text-base = 16px）
const INPUT_CLASS = 'min-h-12 w-full rounded-xl border border-stone-200 bg-white px-3 text-base outline-none focus:ring-2 focus:ring-brand/40';

const LoginPage = () => {
  const { session, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [error,      setError]      = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ログイン前に開こうとしていた画面（RequireAuth が渡してくれる）。なければ一覧へ
  // `as { from?: string } | null` は「state の中身はこの形のはず」と TS に伝える書き方
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  // すでにログイン済みなら、ログイン画面は出さない
  if (!loading && session) return <Navigate to={from} replace />;

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const message = await signIn(email.trim(), password);
    setSubmitting(false);
    if (message) {
      setError(message);
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 text-stone-800">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="mb-2 text-5xl">🍲</p>
          <h1 className="text-3xl font-extrabold tracking-tight">なに食べたい？</h1>
          <p className="mt-1 text-sm text-stone-500">ふたりのレシピ帳</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 rounded-3xl bg-white p-5 shadow-sm shadow-stone-900/5">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-bold">メールアドレス</label>
            {/* autoComplete：iPhone のパスワード自動入力（キーチェーン）が効くように */}
            <input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-bold">パスワード</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="min-h-12 w-full rounded-full bg-brand font-bold text-white shadow-md shadow-brand/30 disabled:opacity-60"
          >
            {submitting ? 'ログイン中…' : 'ログイン'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-stone-400">アカウントは管理者が発行しています</p>
      </div>
    </main>
  );
};

export default LoginPage;
