import type { HistoryEntry } from '../types/history';

/**
 * 履歴画面のダミーデータ（Supabase につなぐまでの仮置き）
 *
 * `HistoryEntry[]` と書くと「HistoryEntry の配列」という意味。
 * 項目名を打ち間違えたり、必須の項目を書き忘れたりすると、ここで赤線が出る。
 */
export const MOCK_HISTORY: HistoryEntry[] = [
  { id: 'h1', recipeId: 'r1', cookedOn: '2026-10-16', memo: '玉ねぎ多めが好評' },
  { id: 'h2', recipeId: 'r2', cookedOn: '2026-10-14' },
  { id: 'h3', recipeId: 'r3', cookedOn: '2026-10-12', memo: '次はしらたきを入れる' },
  { id: 'h4', recipeId: 'r4', cookedOn: '2026-10-09', memo: 'バター醤油で' },
  { id: 'h5', recipeId: 'r5', cookedOn: '2026-10-05' },
  { id: 'h6', recipeId: 'r1', cookedOn: '2026-09-28' },
];
