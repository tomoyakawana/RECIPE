import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigationType } from 'react-router';
import { useSecretModeQuery } from '../../../hooks/useSettings';
import LoadError from '../../common/LoadError';
import Loading from '../../common/Loading';

// 下タブ（iPhone）／上メニュー（タブレット）／左のサイドバー（PC）に並べる画面
// match：今の URL がこのタブに属するかの判定（レシピ詳細・追加も「レシピ」タブ扱いにする）
const NAV_ITEMS = [
  { to: '/',        label: 'レシピ',     icon: '📖', match: (path: string) => path === '/' || path.startsWith('/recipes') },
  { to: '/todo',    label: 'リクエスト', icon: '🙋', match: (path: string) => path.startsWith('/todo') },
  { to: '/memo',    label: 'メモ',       icon: '📝', match: (path: string) => path.startsWith('/memo') },
  { to: '/history', label: '作ったご飯', icon: '🍚', match: (path: string) => path.startsWith('/history') },
  { to: '/settings', label: '設定',      icon: '⚙️', match: (path: string) => path.startsWith('/settings') },
];

/**
 * 全画面共通の枠
 * iPhone：画面下に固定のタブバー（親指で届く位置）
 * タブレット・狭いウィンドウ（md 以上）：画面上に横並びのメニュー
 * PC（lg 以上）：画面の左に固定のサイドバー。本文は残りの幅の中で中央に置く
 */
const MainLayout = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const { data: secretMode, isPending, error, refetch } = useSecretModeQuery();

  // 画面を移ったら一番上から見せる（一覧の途中でレシピを押しても、詳細が途中の高さから始まらないように）
  // 「戻る」（POP。iPhone の左端からのスワイプも）のときは何もしない。一覧の見ていた位置はブラウザに任せる
  useEffect(() => {
    if (navigationType !== 'POP') window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, navigationType]);

  // シークレットモードの設定を読み終わるまでは、タブも画面も出さない
  // （読み込み中をオフとして扱うと、開いた一瞬だけ「リクエスト」タブや相手の予定が見えてしまうため）
  if (isPending) return <div className="min-h-dvh pt-24"><Loading /></div>;
  if (error) return <div className="min-h-dvh px-4 pt-24"><LoadError error={error} onRetry={() => refetch()} /></div>;

  // シークレットモードのときは「リクエスト」のタブを出さない
  const items = secretMode ? NAV_ITEMS.filter(item => item.to !== '/todo') : NAV_ITEMS;

  return (
    // lg：サイドバー（固定・幅 w-56）の分だけ、全体を左から空ける
    <div className="min-h-dvh text-stone-800 md:flex md:flex-col lg:pl-56">
      {/* 本文。iPhone では下タブに隠れないよう下に余白を取る */}
      <main className="px-4 pt-6 pb-28 md:order-2 md:mx-auto md:w-full md:max-w-4xl md:px-8 md:pb-10 lg:max-w-6xl lg:px-10 lg:pt-8">
        <Outlet />
      </main>

      {/* サイドバー（lg）は、薄いオレンジの背景。今いる画面だけ、＋ボタンと同じ濃いオレンジにする */}
      <nav
        className="fixed inset-x-3 bottom-3 rounded-3xl bg-white/90 shadow-lg shadow-stone-900/10 backdrop-blur
                   mb-[env(safe-area-inset-bottom)]
                   md:static md:inset-auto md:order-1 md:mb-0 md:rounded-none md:bg-cream/90 md:shadow-none
                   lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-56 lg:flex-col lg:bg-brand/12 lg:backdrop-blur-none"
      >
        {/* アプリの名前（サイドバーのときだけ。iPhone・タブレットでは場所を取るので出さない） */}
        <p className="hidden px-6 pt-7 pb-5 text-lg font-extrabold tracking-tight lg:block">🍲 なに食べたい？</p>

        <ul className="mx-auto flex max-w-4xl gap-1 p-1.5 md:justify-start md:gap-2 md:px-8 md:py-3
                       lg:mx-0 lg:max-w-none lg:flex-1 lg:flex-col lg:gap-1 lg:px-3 lg:pt-0 lg:pb-5">
          {items.map(item => {
            const active = item.match(pathname);
            return (
              // サイドバーでは、設定だけ一番下に離して置く（毎日使う画面と分ける）
              <li key={item.to} className={`flex-1 md:flex-none ${item.to === '/settings' ? 'lg:mt-auto' : ''}`}>
                <NavLink
                  to={item.to}
                  className={`flex min-h-13 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] transition-colors
                    md:min-h-10 md:flex-row md:gap-1.5 md:rounded-full md:px-4 md:text-sm
                    lg:min-h-11 lg:justify-start lg:gap-3 lg:rounded-xl lg:text-[15px]
                    ${active ? 'bg-brand/10 font-bold text-brand lg:bg-brand lg:text-white lg:shadow-md lg:shadow-brand/30' : 'text-stone-500 lg:text-stone-600 lg:hover:bg-brand/10'}`}
                >
                  <span className="text-xl md:text-base">{item.icon}</span>
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default MainLayout;
