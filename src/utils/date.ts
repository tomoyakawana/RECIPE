const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** 今日の日付を 'YYYY-MM-DD' で返す（端末のローカル時刻＝日本時間） */
export const todayYmd = (): string => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

/**
 * '2026-10-16' → '10/16（金）'
 * new Date('YYYY-MM-DD') は UTC 扱いになり日付がずれることがあるため、数値に分解してローカル日付として作る。
 */
export const fmtYmd = (ymd: string): string => {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${m}/${d}（${WEEKDAYS[date.getDay()]}）`;
};
