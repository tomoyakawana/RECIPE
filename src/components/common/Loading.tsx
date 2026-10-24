/** 読み込み中の表示（DB からデータを読んでいる間に出す） */
const Loading = () => {
  return (
    // role="status"：読み上げ機能にも「読み込み中」と伝える
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-16 text-stone-400">
      <span className="size-8 animate-spin rounded-full border-4 border-stone-200 border-t-brand" />
      <span className="text-sm">読み込み中…</span>
    </div>
  );
};

export default Loading;
