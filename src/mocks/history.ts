import type { HistoryEntry } from '../types/history';

/**
 * 履歴画面のダミーデータ（Supabase につなぐまでの仮置き）
 *
 * `HistoryEntry[]` と書くと「HistoryEntry の配列」という意味。
 * 項目名を打ち間違えたり、必須の項目を書き忘れたりすると、ここで赤線が出る。
 */
export const MOCK_HISTORY: HistoryEntry[] = [
  { id: '1', recipeName: '豚の生姜焼き',       cookedOn: '2026-10-16', memo: '玉ねぎ多めが好評' },
  { id: '2', recipeName: '鮭のホイル焼き',     cookedOn: '2026-10-14' },
  { id: '3', recipeName: '肉じゃが',           cookedOn: '2026-10-12', memo: '次はしらたきを入れる' },
  { id: '4', recipeName: 'きのこの和風パスタ', cookedOn: '2026-10-09', memo: 'バター醤油で' },
  { id: '5', recipeName: '麻婆豆腐',           cookedOn: '2026-10-05' },
];
