import { useState } from 'react';
import { WEEKDAYS, parseYmd, toYmd } from '../../utils/date';

type Props = {
  today     : string;
  // 日付（YYYY-MM-DD）→ その日に表示する絵文字の配列
  marks     : Map<string, string[]>;
  selected? : string;
  onSelect  : (ymd: string) => void;
};

/**
 * 月表示のカレンダー（予定のある日に料理の絵文字を出す）
 * 日曜始まり。前後の月の日は空欄にする
 */
const MonthCalendar = ({ today, marks, selected, onSelect }: Props) => {
  // 表示中の月（その月の 1 日）
  const [month, setMonth] = useState(() => {
    const d = parseYmd(today);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const moveMonth = (n: number) => setMonth(m => new Date(m.getFullYear(), m.getMonth() + n, 1));

  // 1 日の曜日の数だけ空欄を入れてから、1 日〜月末を並べる
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  // (string | null)[]：日付の文字列か、空欄を表す null の配列
  const cells: (string | null)[] = [
    ...Array<null>(month.getDay()).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => toYmd(new Date(month.getFullYear(), month.getMonth(), i + 1))),
  ];

  return (
    <div className="rounded-3xl bg-white p-3 shadow-sm shadow-stone-900/5">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => moveMonth(-1)} aria-label="前の月" className="size-10 rounded-full text-xl text-stone-500">
          ‹
        </button>
        <p className="font-bold">{month.getFullYear()}年{month.getMonth() + 1}月</p>
        <button type="button" onClick={() => moveMonth(1)} aria-label="次の月" className="size-10 rounded-full text-xl text-stone-500">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-stone-400">
        {WEEKDAYS.map((w, i) => (
          <span key={w} className={`py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-sky-500' : ''}`}>{w}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((ymd, i) => {
          if (!ymd) return <span key={`blank-${i}`} />;
          const day        = parseYmd(ymd).getDate();
          const emojis     = marks.get(ymd) ?? [];
          const isToday    = ymd === today;
          const isSelected = ymd === selected;
          return (
            <button
              key={ymd}
              type="button"
              onClick={() => onSelect(ymd)}
              className={`flex min-h-13 flex-col items-center justify-start rounded-xl pt-1 transition-colors ${
                isSelected ? 'bg-brand/15' : ''
              }`}
            >
              <span
                className={`flex size-6 items-center justify-center rounded-full text-sm ${
                  isToday ? 'bg-brand font-bold text-white' : ymd < today ? 'text-stone-300' : ''
                }`}
              >
                {day}
              </span>
              {/* 予定の絵文字は2つまで。それ以上は +n */}
              <span className="text-sm leading-tight">
                {emojis.slice(0, 2).join('')}
                {emojis.length > 2 && <span className="text-[10px] text-stone-400">+{emojis.length - 2}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MonthCalendar;
