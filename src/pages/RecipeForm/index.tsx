import { useState, type SubmitEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMockStore } from '../../hooks/useMockStore';
import type { Ingredient, Recipe } from '../../types/recipe';

// 入力欄の共通スタイル（iOS の自動ズームを避けるため text-base = 16px）
const INPUT_CLASS = 'min-h-12 w-full rounded-xl border border-stone-200 bg-white px-3 text-base outline-none focus:ring-2 focus:ring-brand/40';

const EMPTY_INGREDIENT: Ingredient = { name: '', amount: '' };

/**
 * レシピの追加・編集で共通のフォーム
 * recipe を渡すと編集モード（今の内容を入力済みで開く）、渡さなければ追加モード
 */
const RecipeForm = ({ recipe }: { recipe?: Recipe }) => {
  const navigate = useNavigate();
  const { addRecipe, updateRecipe } = useMockStore();
  const isEdit = recipe !== undefined;

  // 編集時は今の値を初期値にする。数値は入力欄用に文字列へ
  const [title,       setTitle]       = useState(recipe?.title ?? '');
  const [cookMinutes, setCookMinutes] = useState(recipe?.cookMinutes?.toString() ?? '');
  const [servings,    setServings]    = useState(recipe?.servings?.toString() ?? '');
  const [tags,        setTags]        = useState(recipe?.tags.join(' ') ?? '');
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe && recipe.ingredients.length > 0 ? recipe.ingredients : [EMPTY_INGREDIENT],
  );
  const [steps,       setSteps]       = useState(recipe?.steps.join('\n') ?? '');
  const [sourceUrl,   setSourceUrl]   = useState(recipe?.sourceUrl ?? '');
  const [importNote,  setImportNote]  = useState('');

  // 材料の i 行目の name か amount を書き換える
  // `keyof Ingredient` は 'name' | 'amount' のどちらか、という型
  const updateIngredient = (i: number, key: keyof Ingredient, value: string) => {
    setIngredients(prev => prev.map((ing, idx) => (idx === i ? { ...ing, [key]: value } : ing)));
  };

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) return;
    const input = {
      title      : title.trim(),
      // 空欄なら undefined（＝項目なし）にする
      cookMinutes: cookMinutes ? Number(cookMinutes) : undefined,
      servings   : servings ? Number(servings) : undefined,
      tags       : tags.split(/[,、\s]+/).filter(Boolean),
      ingredients: ingredients.filter(ing => ing.name.trim()),
      steps      : steps.split('\n').map(s => s.trim()).filter(Boolean),
      sourceUrl  : sourceUrl.trim() || undefined,
    };
    if (isEdit) {
      updateRecipe(recipe.id, input);
      // replace：戻るボタンで編集画面に戻らないよう、履歴を置き換える
      navigate(`/recipes/${recipe.id}`, { replace: true });
    } else {
      const id = addRecipe(input);
      navigate(`/recipes/${id}`, { replace: true });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Link to={isEdit ? `/recipes/${recipe.id}` : '/'} className="mb-3 inline-flex min-h-11 items-center text-sm text-stone-500">
        ‹ キャンセル
      </Link>
      <h1 className="mb-4 text-3xl font-extrabold tracking-tight">{isEdit ? 'レシピを編集' : 'レシピを追加'}</h1>

      {/* 写真から取り込み（機能5）。今は写真を選ぶところまで */}
      <label className="mb-6 flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand/40 bg-white font-bold text-brand">
        📷 写真から取り込む（AI）
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => setImportNote(e.target.files?.[0] ? `「${e.target.files[0].name}」を選択しました。AI での読み取りは後で実装します。` : '')}
        />
      </label>
      {importNote && <p className="-mt-4 mb-6 text-sm text-stone-500">{importNote}</p>}

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-bold">料理名 <span className="text-red-500">*</span></label>
          <input value={title} onChange={e => setTitle(e.target.value)} required className={INPUT_CLASS} placeholder="例：豚の生姜焼き" />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-bold">調理時間（分）</label>
            <input type="number" inputMode="numeric" value={cookMinutes} onChange={e => setCookMinutes(e.target.value)} className={INPUT_CLASS} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-bold">何人分</label>
            <input type="number" inputMode="numeric" value={servings} onChange={e => setServings(e.target.value)} className={INPUT_CLASS} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold">タグ</label>
          <input value={tags} onChange={e => setTags(e.target.value)} className={INPUT_CLASS} placeholder="例：和食 豚肉（スペース区切り）" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold">材料</label>
          <div className="space-y-2">
            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2">
                <input value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} className={`${INPUT_CLASS} flex-[2]`} placeholder="材料" />
                <input value={ing.amount} onChange={e => updateIngredient(i, 'amount', e.target.value)} className={`${INPUT_CLASS} flex-1`} placeholder="分量" />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIngredients(prev => [...prev, EMPTY_INGREDIENT])}
            className="mt-2 min-h-11 text-sm font-bold text-brand"
          >
            ＋ 材料を追加
          </button>
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold">作り方（1行 = 1ステップ）</label>
          <textarea value={steps} onChange={e => setSteps(e.target.value)} rows={5} className={`${INPUT_CLASS} py-2`} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold">参考URL</label>
          <input type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} className={INPUT_CLASS} placeholder="https://" />
        </div>
      </div>

      <button type="submit" className="mt-6 min-h-13 w-full rounded-full bg-brand font-bold text-white shadow-lg shadow-brand/30">
        保存する
      </button>
    </form>
  );
};

/**
 * /recipes/new → 追加、/recipes/:id/edit → 編集
 * key に id を渡すのは、別のレシピの編集画面に移ったときにフォームの中身を作り直すため
 */
const RecipeFormPage = () => {
  const { id } = useParams();
  const { recipes } = useMockStore();

  if (id === undefined) return <RecipeForm key="new" />;

  const recipe = recipes.find(r => r.id === id);
  if (!recipe) {
    return (
      <div className="py-10 text-center">
        <p className="mb-4 text-stone-500">レシピが見つかりません</p>
        <Link to="/" className="text-brand underline">レシピ一覧へ</Link>
      </div>
    );
  }
  return <RecipeForm key={recipe.id} recipe={recipe} />;
};

export default RecipeFormPage;
