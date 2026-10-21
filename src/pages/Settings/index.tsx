import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { MOCK_ACCOUNT } from '../../mocks/account';

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

/**
 * 設定画面
 * ※ ログイン機能を入れるまでは、アカウントとログアウトは見た目だけ（モック）
 */
const SettingsPage = () => {
  const navigate = useNavigate();

  return (
    <>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-3 inline-flex min-h-11 items-center text-sm text-stone-500"
      >
        ‹ 戻る
      </button>
      <h1 className="mb-5 text-3xl font-extrabold tracking-tight">設定</h1>

      <div className="md:max-w-xl">
        <Section title="アカウント">
          <Row label="ログイン中" note="ログイン機能を入れたら、実際のアカウントが表示されます">
            <span className="block max-w-44 truncate">{MOCK_ACCOUNT.email}</span>
          </Row>
        </Section>

        <Section title="表示">
          {/* 予定日の表示をユーザーごとに分ける機能（HANDOFF 15 章）を作るときに、ここに切り替えを置く */}
          <Row label="今週作るの予定日を表示する" note="準備中：予定日を見せない設定にできるようになります">
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs">準備中</span>
          </Row>
        </Section>

        <Section title="このアプリについて">
          <Row label="アプリ名">なに食べたい？</Row>
        </Section>

        {/* ログイン機能を入れるまでは押せない */}
        <button
          type="button"
          disabled
          className="mt-2 min-h-12 w-full rounded-2xl bg-white font-bold text-red-500 shadow-sm shadow-stone-900/5 disabled:text-stone-300"
        >
          ログアウト
        </button>
        <p className="mt-2 text-center text-xs text-stone-400">ログアウトは、ログイン機能を入れたら使えます</p>
      </div>
    </>
  );
};

export default SettingsPage;
