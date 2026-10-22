import { useState, type SubmitEvent } from 'react';
import { useMockStore } from '../../hooks/useMockStore';

// 入力欄の共通スタイル（iOS の自動ズームを避けるため text-base = 16px）
const INPUT_CLASS = 'min-h-11 rounded-xl border border-stone-200 bg-white px-3 text-base outline-none focus:ring-2 focus:ring-brand/40';

const MemoPage = () => {
  const {
    shopping, note, recipes, todo, secretMode,
    addShoppingItem, toggleShoppingItem, removeShoppingItem, clearCheckedShopping, addTodoIngredients, setNote,
  } = useMockStore();

  const [name,   setName]   = useState('');
  const [amount, setAmount] = useState('');
  const [notice, setNotice] = useState('');

  const handleAdd = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    addShoppingItem(name.trim(), amount.trim() || undefined);
    setName('');
    setAmount('');
  };

  const handleAddFromTodo = () => {
    const count = addTodoIngredients();
    setNotice(count > 0 ? `${count}品を追加しました。家にあるものは ✕ で消してください` : '追加する材料はありませんでした');
  };

  // まだ買っていないものを上、買ったものを下に
  const unchecked    = shopping.filter(i => !i.checked);
  const checked      = shopping.filter(i => i.checked);
  const checkedCount = checked.length;

  const recipeTitle = (recipeId?: string) => recipes.find(r => r.id === recipeId)?.title;

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">メモ</h1>
      <p className="mt-1 mb-5 text-sm text-stone-500">買い物リストと、ふたりの共有メモ</p>

      <div className="md:grid md:grid-cols-2 md:items-start md:gap-6">
        {/* ---- 買い物リスト ---- */}
        <section className="mb-6 rounded-3xl bg-white p-4 shadow-sm shadow-stone-900/5 md:mb-0">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">🛒 買い物リスト</h2>
            <span className="text-xs text-stone-500">残り {unchecked.length}品</span>
          </div>

          {/* リクエストの材料から追加 */}
          <button
            type="button"
            onClick={handleAddFromTodo}
            disabled={todo.length === 0}
            className="mb-3 min-h-11 w-full rounded-full bg-brand/10 text-sm font-bold text-brand disabled:bg-stone-100 disabled:text-stone-400"
          >
            🙋 リクエストの材料から追加
          </button>
          {notice && <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">{notice}</p>}

          {/* 手入力で追加 */}
          <form onSubmit={handleAdd} className="mb-3 flex gap-2">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="品名" className={`${INPUT_CLASS} min-w-0 flex-[2]`} />
            <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="分量" className={`${INPUT_CLASS} min-w-0 flex-1`} />
            <button type="submit" className="min-h-11 shrink-0 rounded-xl bg-brand px-4 text-sm font-bold text-white">追加</button>
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
                      onChange={() => toggleShoppingItem(item.id)}
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
                    onClick={() => removeShoppingItem(item.id)}
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
            <button type="button" onClick={clearCheckedShopping} className="mt-3 min-h-10 w-full text-sm text-stone-500">
              買ったもの（{checkedCount}品）を消す
            </button>
          )}
        </section>

        {/* ---- 共有メモ ---- */}
        <section className="rounded-3xl bg-white p-4 shadow-sm shadow-stone-900/5">
          <h2 className="mb-3 text-lg font-bold">📝 メモ</h2>
          {/* モックでは入力のたびに保存。DB につなぐときは、打ち終わってから保存する（デバウンス）予定 */}
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={8}
            placeholder="ふたりで共有したいことを書いておこう"
            className="w-full resize-y rounded-xl border border-stone-200 bg-cream/50 p-3 text-base leading-relaxed outline-none focus:ring-2 focus:ring-brand/40"
          />
        </section>
      </div>
    </>
  );
};

export default MemoPage;
