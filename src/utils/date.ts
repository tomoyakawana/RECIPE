export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** Date → 'YYYY-MM-DD'（端末のローカル時刻＝日本時間で） */
export const toYmd = (d: Date): string => {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

/**
 * 'YYYY-MM-DD' → Date（ローカル日付の 0 時）
 * new Date('YYYY-MM-DD') は UTC 扱いになり日付がずれることがあるため、数値に分解して作る。
 */
export const parseYmd = (ymd: string): Date => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** 今日の日付を 'YYYY-MM-DD' で返す */
export const todayYmd = (): string => toYmd(new Date());

/** 'YYYY-MM-DD' の n 日後（マイナスなら前）を返す */
export const addDays = (ymd: string, n: number): string => {
  const d = parseYmd(ymd);
  d.setDate(d.getDate() + n);
  return toYmd(d);
};

/** '2026-10-16' → '10/16（金）' */
export const fmtYmd = (ymd: string): string => {
  const date = parseYmd(ymd);
  return `${date.getMonth() + 1}/${date.getDate()}（${WEEKDAYS[date.getDay()]}）`;
};
