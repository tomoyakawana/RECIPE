import { useState, type ChangeEvent, type SubmitEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import AiImport from '../../components/common/AiImport';
import LoadError from '../../components/common/LoadError';
import Loading from '../../components/common/Loading';
import TagSelector from '../../components/common/TagSelector';
import { useRecipe, useRecipes, useSaveRecipe } from '../../hooks/useRecipes';
import { useToast } from '../../hooks/useToast';
import type { Ingredient, Recipe, RecipeInput } from '../../types/recipe';
import type { RecipeDraft } from '../../utils/parseRecipe';
import { resizeImageToBase64 } from '../../utils/image';
import RecipePhoto from '../../components/common/RecipePhoto';

// 入力欄の共通スタイル（iOS の自動ズームを避けるため text-base = 16px）
const INPUT_CLASS = 'min-h-12 w-full rounded-xl border border-stone-200 bg-white px-3 text-base outline-none focus:ring-2 focus:ring-brand/40';

const EMPTY_INGREDIENT: Ingredient = { name: '', amount: '' };

/**
 * 料理名を比べるための形にそろえる（重複チェック用）
 * NFKC：全角英数字を半角に（「ＡＢＣ」→「ABC」）／空白を全部消す／大文字・小文字をそろえる
 */
const normalizeTitle = (title: string) => title.normalize('NFKC').replace(/\s+/g, '').toLowerCase();

/**
 * レシピの追加・編集で共通のフォーム
 * recipe を渡すと編集モード（今の内容を入力済みで開く）、渡さなければ追加モード
 */
const RecipeForm = ({ recipe }: { recipe?: Recipe }) => {
  const navigate = useNavigate();
  // 今あるレシピ（タグの選択肢と、料理名の重複確認に使う）。読めていなければ空として扱う
  const { data: recipes = [] } = useRecipes();
  const saveRecipe = useSaveRecipe();
  const toast = useToast();

  // 今あるレシピに付いているタグ（重複なし）。タグの選択肢と、AI に「なるべくこれを使って」と渡す一覧に使う
  const allTags = [...new Set(recipes.flatMap(r => r.tags))];
  const isEdit = recipe !== undefined;

  // 編集時は今の値を初期値にする。数値は入力欄用に文字列へ
  const [title,       setTitle]       = useState(recipe?.title ?? '');
  const [cookMinutes, setCookMinutes] = useState(recipe?.cookMinutes?.toString() ?? '');
  const [servings,    setServings]    = useState(recipe?.servings?.toString() ?? '');
  const [tags,        setTags]        = useState<string[]>(recipe?.tags ?? []);
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe && recipe.ingredients.length > 0 ? recipe.ingredients : [EMPTY_INGREDIENT],
  );
  // 作り方は1ステップ = 1つの入力欄。空なら1つだけ空欄を出す
  const [steps,       setSteps]       = useState<string[]>(recipe && recipe.steps.length > 0 ? recipe.steps : ['']);
  const [sourceUrl,   setSourceUrl]   = useState(recipe?.sourceUrl ?? '');

  // 写真：imagePath は保存済みの写真（✕ で外したら undefined）、imageFile は新しく選んだ写真（保存するときに上げる）
  const [imagePath,   setImagePath]   = useState(recipe?.imagePath);
  const [imageFile,   setImageFile]   = useState<File>();
  // 新しく選んだ写真の見本（縮めた画像を data URL にしたもの）
  const [preview,     setPreview]     = useState<string>();
  // 見本（新しく選んだ写真）か、保存済みの写真があれば「写真あり」
  const hasImage = !!preview || !!imagePath;

  // AI が読み取った下書きをフォームに入れる（URL から取り込んだときは、その URL を参考URL に入れる）
  const applyDraft = (draft: RecipeDraft, url?: string) => {
    // すでに何か入力していたら、上書きしてよいか確認する
    const hasInput = title.trim() || steps.some(st => st.trim()) || ingredients.some(ing => ing.name.trim());
    if (hasInput && !window.confirm('入力中の内容を、読み取った内容で置き換えますか？')) return;

    setTitle(draft.title);
    setCookMinutes(draft.cookMinutes?.toString() ?? '');
    setServings(draft.servings?.toString() ?? '');
    setTags(draft.tags);
    setIngredients(draft.ingredients.length > 0 ? draft.ingredients : [EMPTY_INGREDIENT]);
    setSteps(draft.steps.length > 0 ? draft.steps : ['']);
    if (url) setSourceUrl(url);
  };

  // 材料の i 行目の name か amount を書き換える
  // `keyof Ingredient` は 'name' | 'amount' のどちらか、という型
  const updateIngredient = (i: number, key: keyof Ingredient, value: string) => {
    setIngredients(prev => prev.map((ing, idx) => (idx === i ? { ...ing, [key]: value } : ing)));
  };

  // 材料の i 行目を消す（最後の1行は消さずに空にする）
  const removeIngredient = (i: number) => {
    setIngredients(prev => (prev.length === 1 ? [EMPTY_INGREDIENT] : prev.filter((_, idx) => idx !== i)));
  };

  // 作り方の i 番目を書き換える／欄を消す（最後の1つは消さずに空にする）
  const updateStep = (i: number, value: string) => {
    setSteps(prev => prev.map((st, idx) => (idx === i ? value : st)));
  };
  const removeStep = (i: number) => {
    setSteps(prev => (prev.length === 1 ? [''] : prev.filter((_, idx) => idx !== i)));
  };

  // 写真を選んだ（撮った）とき。見本は小さく縮めて出す（元の写真は大きく、そのまま出すと重いため）
  const handlePickImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 同じ写真をもう一度選んでも onChange が呼ばれるように、選択を空に戻す
    e.target.value = '';
    if (!file) return;
    try {
      setPreview(`data:image/jpeg;base64,${await resizeImageToBase64(file, 800)}`);
      setImageFile(file);
    } catch {
      toast.error('写真を読み込めませんでした');
    }
  };

  // ✕：写真を外す（保存したときに、前の写真も Storage から消える）
  const handleRemoveImage = () => {
    setImageFile(undefined);
    setPreview(undefined);
    setImagePath(undefined);
  };

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    // 保存中にもう一度送られたら何もしない（ボタンは押せなくしてあるが、Enter キーでも送れるため）
    if (!title.trim() || saveRecipe.isPending) return;

    // 同じ料理名のレシピがすでにあれば確認する（編集中の自分自身とは比べない）
    // 「肉じゃが（甘め）」のように同じ料理の別レシピもありうるので、止めずに確認だけにする
    const duplicated = recipes.some(r => r.id !== recipe?.id && normalizeTitle(r.title) === normalizeTitle(title));
    if (duplicated && !window.confirm(`「${title.trim()}」という名前のレシピがすでにあります。このまま保存しますか？`)) return;
    const input: RecipeInput = {
      title      : title.trim(),
      // 空欄なら undefined（＝項目なし）にする
      cookMinutes: cookMinutes ? Number(cookMinutes) : undefined,
      servings   : servings ? Number(servings) : undefined,
      tags       : tags,
      ingredients: ingredients.filter(ing => ing.name.trim()),
      // 空の欄は除く
      steps      : steps.map(st => st.trim()).filter(Boolean),
      sourceUrl  : sourceUrl.trim() || undefined,
      imagePath  : imagePath,
    };

    try {
      // 保存して、一覧を読み直すまで待つ。失敗したら catch へ（トーストは useSaveRecipe が出す）
      const id = await saveRecipe.mutateAsync({ recipeId: recipe?.id ?? null, input, imageFile, oldImagePath: recipe?.imagePath });
      // 追加したら一覧へ（続けて次のレシピを探せる）、編集したら詳細へ（直した結果をその場で確かめる）
      // replace：戻るボタンで編集画面に戻らないよう、履歴を置き換える
      navigate(isEdit ? `/recipes/${id}` : '/', { replace: true });
      toast.success(isEdit ? 'レシピを更新しました' : 'レシピを追加しました');
    } catch {
      // 失敗したときは画面を移らず、入力した内容をそのまま残す
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Link to={isEdit ? `/recipes/${recipe.id}` : '/'} className="mb-3 inline-flex min-h-11 items-center text-sm text-stone-500">
        ‹ キャンセル
      </Link>
      <h1 className="mb-4 text-3xl font-extrabold tracking-tight">{isEdit ? 'レシピを編集' : 'レシピを追加'}</h1>

      {/* AI で取り込む（機能5）。結果はフォームに入れるだけで、保存はしない */}
      <AiImport onDraft={applyDraft} existingTags={allTags} />

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-bold">写真</label>
          {hasImage && (
            <div className="relative mb-2">
              {preview ? (
                <img src={preview} alt="" className="aspect-4/3 w-full rounded-xl object-cover" />
              ) : (
                <RecipePhoto imagePath={imagePath} size="large" className="aspect-4/3 w-full rounded-xl" />
              )}
              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={saveRecipe.isPending}
                aria-label="写真を外す"
                className="absolute top-2 right-2 flex size-9 items-center justify-center rounded-full bg-black/50 text-white"
              >
                ✕
              </button>
            </div>
          )}
          {/* AI 取り込みと同じく、label の中に隠した input を置く（label を押すと写真の選択が開く） */}
          <label className="inline-flex min-h-11 cursor-pointer items-center text-sm font-bold text-brand">
            📷 {hasImage ? '写真を変える' : '写真を付ける'}
            <input type="file" accept="image/*" className="hidden" onChange={handlePickImage} disabled={saveRecipe.isPending} />
          </label>
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold">料理名 <span className="text-red-500">*</span></label>
          <input value={title} onChange={e => setTitle(e.target.value)} required maxLength={100} className={INPUT_CLASS} placeholder="例：豚の生姜焼き" />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-bold">調理時間（分）</label>
            <input type="number" inputMode="numeric" min={1} value={cookMinutes} onChange={e => setCookMinutes(e.target.value)} className={INPUT_CLASS} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-bold">何人分</label>
            <input type="number" inputMode="numeric" min={1} value={servings} onChange={e => setServings(e.target.value)} className={INPUT_CLASS} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold">タグ</label>
          <TagSelector selected={tags} options={allTags} onChange={setTags} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold">材料</label>
          <div className="space-y-2">
            {ingredients.map((ing, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} maxLength={100} className={`${INPUT_CLASS} min-w-0 flex-[2]`} placeholder="材料" />
                <input value={ing.amount} onChange={e => updateIngredient(i, 'amount', e.target.value)} className={`${INPUT_CLASS} min-w-0 flex-1`} placeholder="分量" />
                <button
                  type="button"
                  onClick={() => removeIngredient(i)}
                  aria-label={`材料${i + 1}を消す`}
                  className="flex size-10 shrink-0 items-center justify-center text-sm text-stone-400"
                >
                  ✕
                </button>
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
          <label className="mb-1 block text-sm font-bold">作り方</label>
          <ol className="space-y-2">
            {steps.map((st, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-3 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                  {i + 1}
                </span>
                <textarea
                  value={st}
                  onChange={e => updateStep(i, e.target.value)}
                  rows={2}
                  placeholder={i === 0 ? '例：玉ねぎを薄切りにする' : ''}
                  className={`${INPUT_CLASS} min-w-0 flex-1 resize-y py-2`}
                />
                <button
                  type="button"
                  onClick={() => removeStep(i)}
                  aria-label={`手順${i + 1}を消す`}
                  className="mt-1.5 flex size-10 shrink-0 items-center justify-center text-sm text-stone-400"
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => setSteps(prev => [...prev, ''])}
            className="mt-2 min-h-11 text-sm font-bold text-brand"
          >
            ＋ 手順を追加
          </button>
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold">参考URL</label>
          <input type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} className={INPUT_CLASS} placeholder="https://" />
        </div>
      </div>

      <button
        type="submit"
        disabled={saveRecipe.isPending}
        className="mt-6 min-h-13 w-full rounded-full bg-brand font-bold text-white shadow-lg shadow-brand/30 disabled:opacity-50"
      >
        {saveRecipe.isPending ? '保存中…' : '保存する'}
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
  // 編集のときだけ使う（追加のときは id がないので undefined が返る）
  const { data: recipe, isPending, error, refetch } = useRecipe(id);

  if (id === undefined) return <RecipeForm key="new" />;

  if (isPending) return <Loading />;
  if (error) return <LoadError error={error} onRetry={() => refetch()} />;
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
