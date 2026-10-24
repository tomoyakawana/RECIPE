import { useEffect, useState, type SubmitEvent } from 'react';
import LoadError from '../../components/common/LoadError';
import Loading from '../../components/common/Loading';
import { useMockStore } from '../../hooks/useMockStore';
import { useRecipes } from '../../hooks/useRecipes';
import {
  useAddShoppingItem, useAddTodoIngredients, useClearChecked, useRemoveShoppingItem,
  useSaveSharedNote, useSharedNote, useShoppingItems, useToggleChecked,
} from '../../hooks/useShopping';
import { useTodoItems } from '../../hooks/useTodo';

// 入力欄の共通スタイル（iOS の自動ズームを避けるため text-base = 16px）
const INPUT_CLASS = 'min-h-11 rounded-xl border border-stone-200 bg-white px-3 text-base outline-none focus:ring-2 focus:ring-brand/40';

// 共有メモ：打ち終わってから保存するまでの待ち時間（ミリ秒）
const NOTE_SAVE_DELAY_MS = 1000;

/* ---- 買い物リスト ---- */
const ShoppingList = () => {
  const { data: shopping, isPending, error, refetch } = useShoppingItems();
  const { data: recipes = [] } = useRecipes();
  const { data: todo = [] } = useTodoItems();
  // シークレットモードは #9 までモックのまま
  const { secretMode } = useMockStore();

  const addItem        = useAddShoppingItem();
  const toggleChecked  = useToggleChecked();
  const removeItem     = useRemoveShoppingItem();
  const clearChecked   = useClearChecked();
  const addIngredients = useAddTodoIngredients();

  const [name,   setName]   = useState('');
  const [amount, setAmount] = useState('');
  const [notice, setNotice] = useState('');

  const handleAdd = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || addItem.isPending) return;
    // 保存できたら入力欄を空にする（失敗したら、書いた内容を残す）
    addItem.mutate({ name: name.trim(), amount: amount.trim() || undefined }, {
      onSuccess: () => {
        setName('');
        setAmount('');
      },
    });
  };

  const handleAddFromTodo = () => {
    addIngredients.mutate(undefined, {
      onSuccess: count =>
        setNotice(count > 0 ? `${count}品を追加しました。家にあるものは ✕ で消してください` : '追加する材料はありませんでした'),
    });
  };

  if (isPending) return <Loading />;
  if (error) return <LoadError error={error} onRetry={() => refetch()} />;

  // まだ買っていないものを上、買ったものを下に
  const unchecked    = shopping.filter(i => !i.checked);
  const checked      = shopping.filter(i => i.checked);
  const checkedCount = checked.length;

  const recipeTitle = (recipeId?: string) => recipes.find(r => r.id === recipeId)?.title;

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">🛒 買い物リスト</h2>
        <span className="text-xs text-stone-500">残り {unchecked.length}品</span>
      </div>

      {/* リクエストの材料から追加 */}
      <button
        type="button"
        onClick={handleAddFromTodo}
        disabled={todo.length === 0 || addIngredients.isPending}
        className="mb-3 min-h-11 w-full rounded-full bg-brand/10 text-sm font-bold text-brand disabled:bg-stone-100 disabled:text-stone-400"
      >
        🙋 リクエストの材料から追加
      </button>
      {notice && <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">{notice}</p>}

      {/* 手入力で追加 */}
      <form onSubmit={handleAdd} className="mb-3 flex gap-2">
        <input value={name} onChange={e => setName(e.target.value)} maxLength={100} placeholder="品名" className={`${INPUT_CLASS} min-w-0 flex-[2]`} />
        <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="分量" className={`${INPUT_CLASS} min-w-0 flex-1`} />
        <button
          type="submit"
          disabled={addItem.isPending}
          className="min-h-11 shrink-0 rounded-xl bg-brand px-4 text-sm font-bold text-white disabled:opacity-50"
        >
          追加
        </button>
      </form>

      {shopping.length === 0 && <p className="py-6 text-center text-sm text-stone-400">買うものはありません</p>}

      <ul>
        {[...unchecked, ...checked].map(item => {
          const from = recipeTitle(item.recipeId);
          return (
            <li key={item.id} className="flex items-center gap-2 border-b border-stone-100 last:border-b-0">
              {/* 行全体をタップでチェックできるように label で囲む */}
              <label className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleChecked.mutate({ itemId: item.id, checked: !item.checked })}
                  className="size-5 shrink-0 accent-brand"
                />
                <span className={`min-w-0 flex-1 ${item.checked ? 'text-stone-400 line-through' : ''}`}>
                  <span className="block truncate">
                    {item.name}
                    {item.amount && <span className="ml-2 text-sm text-stone-500">{item.amount}</span>}
                  </span>
                  {/* シークレットモードでは、どの料理の材料かを出さない（ネタバレ防止） */}
                  {from && !secretMode && <span className="block truncate text-xs text-stone-400">{from}</span>}
                </span>
              </label>
              <button
                type="button"
                onClick={() => removeItem.mutate(item.id)}
                disabled={removeItem.isPending}
                aria-label={`${item.name} を消す`}
                className="flex size-10 shrink-0 items-center justify-center text-sm text-stone-300"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>

      {checkedCount > 0 && (
        <button
          type="button"
          onClick={() => clearChecked.mutate()}
          disabled={clearChecked.isPending}
          className="mt-3 min-h-10 w-full text-sm text-stone-500"
        >
          買ったもの（{checkedCount}品）を消す
        </button>
      )}
    </>
  );
};

/* ---- 共有メモ ---- */
const SharedNote = () => {
  const { data: body, isPending, error, refetch } = useSharedNote();
  const saveNote = useSaveSharedNote();
  // 書きかけの本文。undefined のときは書きかけがない（DB の本文をそのまま出す）
  // 書きかけの間は、アプリに戻ったときの読み直し（#23）で DB の本文が変わっても、入力欄を上書きしない
  const [draft, setDraft] = useState<string>();

  // 保存する。保存できて、その間に書き足していなければ、書きかけを終わりにする
  const save = (text: string) => {
    if (text === body) {
      setDraft(undefined);
      return;
    }
    saveNote.mutate(text, {
      // cur：今の書きかけ。保存している間に書き足していたら、まだ終わりにしない
      onSuccess: () => setDraft(cur => (cur === text ? undefined : cur)),
    });
  };

  // 打ち終わって1秒たったら保存する（デバウンス）。1秒以内にまた打つと、前の予約は取り消される
  useEffect(() => {
    if (draft === undefined) return;
    const timer = setTimeout(() => save(draft), NOTE_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // save は毎回作り直される関数なので、依存に入れると打つたびではなく描画のたびに予約し直してしまう
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  if (isPending) return <Loading />;
  if (error) return <LoadError error={error} onRetry={() => refetch()} />;

  const status = saveNote.isPending ? '保存中…' : draft !== undefined ? '' : saveNote.isSuccess ? '保存しました' : '';

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">📝 メモ</h2>
        {/* aria-live：保存の状態が変わったことを、読み上げ機能にも伝える */}
        <span aria-live="polite" className="text-xs text-stone-400">{status}</span>
      </div>
      <textarea
        value={draft ?? body}
        onChange={e => setDraft(e.target.value)}
        // 入力欄から離れたら（ほかをタップした・タブを移った）、1秒を待たずに保存する
        onBlur={() => draft !== undefined && save(draft)}
        rows={8}
        placeholder="ふたりで共有したいことを書いておこう"
        className="w-full resize-y rounded-xl border border-stone-200 bg-cream/50 p-3 text-base leading-relaxed outline-none focus:ring-2 focus:ring-brand/40"
      />
    </>
  );
};

const MemoPage = () => {
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">メモ</h1>
      <p className="mt-1 mb-5 text-sm text-stone-500">買い物リストと、ふたりの共有メモ</p>

      <div className="md:grid md:grid-cols-2 md:items-start md:gap-6">
        <section className="mb-6 rounded-3xl bg-white p-4 shadow-sm shadow-stone-900/5 md:mb-0">
          <ShoppingList />
        </section>
        <section className="rounded-3xl bg-white p-4 shadow-sm shadow-stone-900/5">
          <SharedNote />
        </section>
      </div>
    </>
  );
};

export default MemoPage;
