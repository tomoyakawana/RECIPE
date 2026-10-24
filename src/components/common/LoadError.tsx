import { dbErrorMessage } from '../../utils/dbError';

type Props = {
  error  : unknown;
  // 「もう一度読み込む」を押したとき（TanStack Query の refetch を渡す）
  onRetry: () => void;
};

/** 読み込みに失敗したときの表示（保存の失敗はこれではなくトーストで知らせる） */
const LoadError = ({ error, onRetry }: Props) => {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 py-16 text-center">
      <span className="text-4xl">🍳💦</span>
      <div>
        <p className="font-bold">読み込めませんでした</p>
        <p className="mt-1 text-sm text-stone-500">{dbErrorMessage(error)}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white active:opacity-80"
      >
        もう一度読み込む
      </button>
    </div>
  );
};

export default LoadError;
