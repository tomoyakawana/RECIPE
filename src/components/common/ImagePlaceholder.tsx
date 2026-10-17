// タグ → 仮の写真に出す絵文字と背景色（上から順に最初に当たったものを使う）
const TAG_STYLES = [
  { tag: 'パスタ', emoji: '🍝', bg: 'from-amber-100 to-orange-200' },
  { tag: 'スープ', emoji: '🥣', bg: 'from-red-100 to-orange-200' },
  { tag: '中華',   emoji: '🥟', bg: 'from-rose-100 to-red-200' },
  { tag: '魚',     emoji: '🐟', bg: 'from-sky-100 to-cyan-200' },
  { tag: '和食',   emoji: '🍲', bg: 'from-amber-100 to-yellow-200' },
  { tag: '洋食',   emoji: '🍳', bg: 'from-yellow-100 to-amber-200' },
];
const DEFAULT_STYLE = { emoji: '🍽️', bg: 'from-stone-100 to-stone-200' };

type Props = {
  tags?     : string[];
  className?: string;
  // 絵文字の大きさ（カードの大きさに合わせて変える）
  emojiSize?: string;
};

/** 写真の仮枠（写真機能を作るまで、タグに合わせた絵文字とグラデーションを出す） */
const ImagePlaceholder = ({ tags = [], className = '', emojiSize = 'text-4xl' }: Props) => {
  const style = TAG_STYLES.find(s => tags.includes(s.tag)) ?? DEFAULT_STYLE;
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br ${style.bg} ${className}`}>
      <span className={emojiSize}>{style.emoji}</span>
    </div>
  );
};

export default ImagePlaceholder;
