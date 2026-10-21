// タグ → 仮の写真・カレンダーに出す絵文字と背景色（上から順に最初に当たったものを使う）
const TAG_STYLES = [
  { tag: 'パスタ', emoji: '🍝', bg: 'from-amber-100 to-orange-200' },
  { tag: 'スープ', emoji: '🥣', bg: 'from-red-100 to-orange-200' },
  { tag: '中華',   emoji: '🥟', bg: 'from-rose-100 to-red-200' },
  { tag: '魚',     emoji: '🐟', bg: 'from-sky-100 to-cyan-200' },
  { tag: '和食',   emoji: '🍲', bg: 'from-amber-100 to-yellow-200' },
  { tag: '洋食',   emoji: '🍳', bg: 'from-yellow-100 to-amber-200' },
];
const DEFAULT_STYLE = { emoji: '🍽️', bg: 'from-stone-100 to-stone-200' };

/** レシピのタグから、表示用の絵文字と背景グラデーションを選ぶ */
export const pickRecipeStyle = (tags: string[] = []) =>
  TAG_STYLES.find(s => tags.includes(s.tag)) ?? DEFAULT_STYLE;
