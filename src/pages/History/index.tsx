import { MOCK_HISTORY } from '../../mocks/history';
import type { HistoryEntry } from '../../types/history';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * '2026-10-16' → '10/16（金）'
 * new Date('YYYY-MM-DD') は UTC 扱いになり日付がずれることがあるため、数値に分解してローカル日付として作る。
 */
const fmtCookedOn = (ymd: string): string => {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${m}/${d}（${WEEKDAYS[date.getDay()]}）`;
};

/* ---- 履歴カード 1枚 ---- */
// props の型は { entry: HistoryEntry } のようにその場で書ける
const HistoryCard = ({ entry }: { entry: HistoryEntry }) => (
  <li className="flex gap-3 rounded-xl border border-neutral-200 bg-white p-3">
    {/* 写真の枠（今は仮のグレー） */}
    <div className="size-20 shrink-0 rounded-lg bg-neutral-200" />
    <div className="min-w-0">
      <p className="text-sm text-neutral-500">{fmtCookedOn(entry.cookedOn)}</p>
      <p className="truncate text-lg font-bold">{entry.recipeName}</p>
      {/* memo は無いこともある（undefined）ので、ある時だけ表示 */}
      {entry.memo && <p className="text-sm text-neutral-600">{entry.memo}</p>}
    </div>
  </li>
);

const HistoryPage = () => {
  // 新しい順に並べる（YYYY-MM-DD 形式なので文字列のまま比較できる）
  const entries = [...MOCK_HISTORY].sort((a, b) => b.cookedOn.localeCompare(a.cookedOn));

  return (
    <main className="px-4 py-6 text-neutral-800 md:mx-auto md:max-w-3xl md:px-8">
      <h1 className="mb-4 text-2xl font-bold">作ったご飯</h1>
      {/* iPhone は1列、PC（md 以上）は2列 */}
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {entries.map(entry => (
          <HistoryCard key={entry.id} entry={entry} />
        ))}
      </ul>
    </main>
  );
};

export default HistoryPage;
