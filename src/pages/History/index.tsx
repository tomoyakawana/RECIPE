import { Link } from 'react-router';
import ImagePlaceholder from '../../components/common/ImagePlaceholder';
import LoadError from '../../components/common/LoadError';
import Loading from '../../components/common/Loading';
import { useHistory } from '../../hooks/useHistory';
import type { HistoryEntry } from '../../types/history';
import { fmtYmd } from '../../utils/date';

/** '2026-10-16' → '2026年10月'（月ごとの見出し用） */
const toMonthLabel = (ymd: string) => {
  const [y, m] = ymd.split('-');
  return `${y}年${Number(m)}月`;
};

const HistoryPage = () => {
  const { data: history, isPending, error, refetch } = useHistory();

  if (isPending) return <Loading />;
  if (error) return <LoadError error={error} onRetry={() => refetch()} />;

  // 月ごとにまとめる（DB から新しい順で届く）。Map は追加した順番を保つので、新しい月から並ぶ
  // Map<string, HistoryEntry[]> は「キーが文字列、値が履歴の配列」の対応表
  const byMonth = new Map<string, HistoryEntry[]>();
  for (const e of history) {
    const key = toMonthLabel(e.cookedOn);
    byMonth.set(key, [...(byMonth.get(key) ?? []), e]);
  }

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">作ったご飯</h1>
      <p className="mt-1 mb-5 text-sm text-stone-500">
        {history.length > 0 ? `これまでに ${history.length} 回作りました` : 'リクエストの「作った！」で、ここに記録されます'}
      </p>

      {[...byMonth].map(([month, items]) => (
        <section key={month} className="mb-6">
          <h2 className="mb-2 text-sm font-bold text-stone-500">
            {month}<span className="ml-2 font-normal">{items.length}回</span>
          </h2>
          <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {items.map(entry => {
              const { recipe } = entry;
              // カードの中身（削除されたレシピは詳細画面がないので、リンクにしない）
              const body = (
                <>
                  <ImagePlaceholder tags={recipe.tags} className="size-16 shrink-0 rounded-xl" emojiSize="text-3xl" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-brand">{fmtYmd(entry.cookedOn)}</p>
                    <p className="truncate font-bold">
                      {recipe.title}
                      {recipe.deleted && <span className="ml-1 text-xs font-normal text-stone-400">（削除済み）</span>}
                    </p>
                    {/* memo は無いこともある（undefined）ので、ある時だけ表示 */}
                    {entry.memo && <p className="truncate text-sm text-stone-500">💬 {entry.memo}</p>}
                  </div>
                </>
              );
              const cardClass = 'flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-sm shadow-stone-900/5';
              return (
                <li key={entry.id}>
                  {recipe.deleted
                    ? <div className={cardClass}>{body}</div>
                    : <Link to={`/recipes/${entry.recipeId}`} className={cardClass}>{body}</Link>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
};

export default HistoryPage;
