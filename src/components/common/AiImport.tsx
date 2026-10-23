import { useState, type ChangeEvent } from 'react';
import { resizeImageToBase64 } from '../../utils/image';
import { parseRecipe, type ParseInput, type RecipeDraft } from '../../utils/parseRecipe';

type Props = {
  // 読み取りに成功したら、フォームに入れてもらう
  onDraft     : (draft: RecipeDraft) => void;
  // 今あるタグ。AI に「なるべくこの中から選んで」と渡す
  existingTags: string[];
};

/**
 * 「📷 写真から」「📋 テキストから」AI でレシピを取り込む部品
 * 結果はフォームに入れるだけで、保存はしない（人が確認してから保存する）
 */
const AiImport = ({ onDraft, existingTags }: Props) => {
  const [mode,    setMode]    = useState<'none' | 'text'>('none');
  const [text,    setText]    = useState('');
  // 読み取り中かどうか。写真は時間がかかるので、待ち時間の目安を変える
  const [loading, setLoading] = useState<false | 'text' | 'image'>(false);
  // disabled などには true / false が必要なので、別に用意する
  const busy = loading !== false;
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const run = async (input: ParseInput) => {
    setLoading('text' in input ? 'text' : 'image');
    setMessage(null);
    const result = await parseRecipe(input, existingTags);
    setLoading(false);
    if (result.error !== undefined) {
      setMessage({ type: 'error', text: result.error });
      return;
    }
    onDraft(result.draft);
    setMode('none');
    setText('');
    setMessage({ type: 'ok', text: '読み取った内容を入れました。間違いがないか確認してから保存してください' });
  };

  const handleImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 同じ写真をもう一度選んでも反応するよう、選択をリセットしておく
    e.target.value = '';
    if (!file) return;
    try {
      const imageBase64 = await resizeImageToBase64(file);
      await run({ imageBase64, mimeType: 'image/jpeg' });
    } catch {
      setLoading(false);
      setMessage({ type: 'error', text: '写真を読み込めませんでした。別の写真でお試しください' });
    }
  };

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 gap-2">
        <label
          className={`flex min-h-14 cursor-pointer items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-brand/40 bg-white text-sm font-bold text-brand ${
            busy ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          📷 写真から
          <input type="file" accept="image/*" className="hidden" onChange={handleImage} disabled={busy} />
        </label>
        <button
          type="button"
          onClick={() => setMode(m => (m === 'text' ? 'none' : 'text'))}
          disabled={busy}
          className={`min-h-14 rounded-2xl border-2 border-dashed text-sm font-bold disabled:opacity-50 ${
            mode === 'text' ? 'border-brand bg-brand/10 text-brand' : 'border-brand/40 bg-white text-brand'
          }`}
        >
          📋 テキストから
        </button>
      </div>
      <p className="mt-1.5 text-center text-xs text-stone-400">AI が料理名・材料・作り方に分けて、下の欄に入れます</p>

      {mode === 'text' && (
        <div className="mt-3 rounded-2xl bg-white p-3 shadow-sm shadow-stone-900/5">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={6}
            placeholder={'写真のテキスト認識（長押しでコピー）や、レシピサイトの文章を貼り付けてください'}
            // iOS の自動ズームを避けるため text-base（16px）
            className="w-full resize-y rounded-xl border border-stone-200 bg-cream/50 p-3 text-base outline-none focus:ring-2 focus:ring-brand/40"
          />
          <button
            type="button"
            onClick={() => run({ text })}
            disabled={busy || !text.trim()}
            className="mt-2 min-h-11 w-full rounded-full bg-brand text-sm font-bold text-white disabled:opacity-50"
          >
            AI で読み取る
          </button>
        </div>
      )}

      {loading && (
        <p className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-3 text-sm text-stone-600 shadow-sm shadow-stone-900/5">
          <span className="inline-block size-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          AI が読み取っています…（{loading === 'image' ? '30秒' : '10秒'}ほどかかることがあります）
        </p>
      )}

      {message && (
        <p
          className={`mt-3 rounded-xl px-3 py-2 text-sm ${
            message.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
};

export default AiImport;
