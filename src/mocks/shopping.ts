import type { ShoppingItem } from '../types/shopping';

/** 買い物リストのダミーデータ */
export const MOCK_SHOPPING: ShoppingItem[] = [
  { id: 's1', name: '牛乳',     checked: false },
  { id: 's2', name: '卵',       amount: '1パック', checked: false },
  { id: 's3', name: 'トイレットペーパー', checked: true },
];

/** 共有メモのダミーデータ */
export const MOCK_NOTE = '週末は実家に行くので、日曜の夜ご飯はなし。\nお米が残り少ない。';
