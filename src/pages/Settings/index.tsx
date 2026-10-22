import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { useMockStore } from '../../hooks/useMockStore';

/* ---- 設定のまとまり（白いカード + 見出し） ---- */
const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mb-5">
    <h2 className="mb-2 px-1 text-sm font-bold text-stone-500">{title}</h2>
    <div className="divide-y divide-stone-100 rounded-2xl bg-white shadow-sm shadow-stone-900/5">{children}</div>
  </section>
);

/* ---- 1行分（左にラベル、右に値や操作） ---- */
const Row = ({ label, children, note }: { label: string; children?: ReactNode; note?: string }) => (
  <div className="flex min-h-13 items-center justify-between gap-3 px-4 py-2">
    <div className="min-w-0">
      <p>{label}</p>
      {note && <p className="text-xs text-stone-400">{note}</p>}
    </div>
    <div className="shrink-0 text-sm text-stone-500">{children}</div>
  </div>
);

/** 設定画面 */
const SettingsPage = () => {
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const { secretMode, setSecretMode } = useMockStore();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <h1 className="mb-5 text-3xl font-extrabold tracking-tight">設定</h1>

      <div className="md:max-w-xl">
        <Section title="アカウント">
          <Row label="ログイン中">
            {/* session?.user.email：ログイン中ならメールアドレス、そうでなければ undefined */}
            <span className="block max-w-52 truncate">{session?.user.email}</span>
          </Row>
        </Section>

        <Section title="表示">
          <Row label="シークレットモード" note="オンにすると「リクエスト」が表示されなくなります（予定を見ないためのモード）">
            {/* role="switch"：読み上げ機能にも「オン・オフの切り替え」だと伝わるように */}
            <button
              type="button"
              role="switch"
              aria-checked={secretMode}
              aria-label="シークレットモード"
              onClick={() => setSecretMode(!secretMode)}
              className={`relative h-8 w-13 rounded-full transition-colors ${secretMode ? 'bg-brand' : 'bg-stone-300'}`}
            >
              <span
                className={`absolute top-1 left-1 size-6 rounded-full bg-white shadow transition-transform ${
                  secretMode ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </Row>
        </Section>

        <Section title="このアプリについて">
          <Row label="アプリ名">なに食べたい？</Row>
        </Section>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="mt-2 min-h-12 w-full rounded-2xl bg-white font-bold text-red-500 shadow-sm shadow-stone-900/5 disabled:opacity-60"
        >
          {signingOut ? 'ログアウト中…' : 'ログアウト'}
        </button>
      </div>
    </>
  );
};

export default SettingsPage;
