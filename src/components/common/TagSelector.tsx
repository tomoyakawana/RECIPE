import { useState, type KeyboardEvent } from 'react';

type Props = {
  selected: string[];
  // 選択肢として並べるタグ（今あるレシピに付いているタグ）
  options : string[];
  onChange: (next: string[]) => void;
};

// タグの長さの上限（長すぎるものはチップが崩れるので）
const MAX_TAG_LENGTH = 20;

/**
 * タグをタップで付け外しする部品
 * 今あるタグをチップで並べ、選ばれているものは色付きで表示する。新しいタグは入力して追加
 */
const TagSelector = ({ selected, options, onChange }: Props) => {
  const [draft, setDraft] = useState('');

  // 今あるタグ ＋（今あるタグにない）選ばれているタグ（AI が新しく付けたものなど）
  const chips = [...options, ...selected.filter(t => !options.includes(t))];

  const toggle = (tag: string) => {
    onChange(selected.includes(tag) ? selected.filter(t => t !== tag) : [...selected, tag]);
  };

  const addDraft = () => {
    // 先頭の # や前後の空白を取り除く
    const tag = draft.trim().replace(/^#+/, '').slice(0, MAX_TAG_LENGTH);
    if (tag && !selected.includes(tag)) onChange([...selected, tag]);
    setDraft('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // 日本語の変換を確定する Enter では追加しない（isComposing：変換中なら true）
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    // Enter でフォーム全体が送信（保存）されないようにする
    e.preventDefault();
    addDraft();
  };

  return (
    <div>
      {chips.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {chips.map(tag => {
            const on = selected.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggle(tag)}
                aria-pressed={on}
                className={`min-h-9 rounded-full px-3 text-sm transition-colors ${
                  on ? 'bg-brand font-bold text-white' : 'bg-white text-stone-600 shadow-sm shadow-stone-900/5'
                }`}
              >
                {on ? '✓ ' : '#'}{tag}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={MAX_TAG_LENGTH}
          placeholder="新しいタグ（例：作り置き）"
          // iOS の自動ズームを避けるため text-base（16px）
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 text-base outline-none focus:ring-2 focus:ring-brand/40"
        />
        <button
          type="button"
          onClick={addDraft}
          disabled={!draft.trim()}
          className="min-h-11 shrink-0 rounded-xl bg-brand/10 px-4 text-sm font-bold text-brand disabled:opacity-50"
        >
          ＋ 追加
        </button>
      </div>
    </div>
  );
};

export default TagSelector;
