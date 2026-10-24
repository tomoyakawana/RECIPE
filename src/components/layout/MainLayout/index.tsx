import { NavLink, Outlet, useLocation } from 'react-router';
import { useSecretModeQuery } from '../../../hooks/useSettings';
import LoadError from '../../common/LoadError';
import Loading from '../../common/Loading';

// 下タブ（iPhone）／上メニュー（PC）に並べる画面
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
 * PC（md 以上）：画面上に横並びのメニュー
 */
const MainLayout = () => {
  const { pathname } = useLocation();
  const { data: secretMode, isPending, error, refetch } = useSecretModeQuery();

  // シークレットモードの設定を読み終わるまでは、タブも画面も出さない
  // （読み込み中をオフとして扱うと、開いた一瞬だけ「リクエスト」タブや相手の予定が見えてしまうため）
  if (isPending) return <div className="min-h-dvh pt-24"><Loading /></div>;
  if (error) return <div className="min-h-dvh px-4 pt-24"><LoadError error={error} onRetry={() => refetch()} /></div>;

  // シークレットモードのときは「リクエスト」のタブを出さない
  const items = secretMode ? NAV_ITEMS.filter(item => item.to !== '/todo') : NAV_ITEMS;

  return (
    <div className="min-h-dvh text-stone-800 md:flex md:flex-col">
      {/* 本文。iPhone では下タブに隠れないよう下に余白を取る */}
      <main className="px-4 pt-6 pb-28 md:order-2 md:mx-auto md:w-full md:max-w-4xl md:px-8 md:pb-10">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-3 bottom-3 rounded-3xl bg-white/90 shadow-lg shadow-stone-900/10 backdrop-blur
                   mb-[env(safe-area-inset-bottom)]
                   md:static md:inset-auto md:order-1 md:mb-0 md:rounded-none md:bg-cream/90 md:shadow-none"
      >
        <ul className="mx-auto flex max-w-4xl gap-1 p-1.5 md:justify-start md:gap-2 md:px-8 md:py-3">
          {items.map(item => {
            const active = item.match(pathname);
            return (
              <li key={item.to} className="flex-1 md:flex-none">
                <NavLink
                  to={item.to}
                  className={`flex min-h-13 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] transition-colors
                    md:min-h-10 md:flex-row md:gap-1.5 md:rounded-full md:px-4 md:text-sm
                    ${active ? 'bg-brand/10 font-bold text-brand' : 'text-stone-500'}`}
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
