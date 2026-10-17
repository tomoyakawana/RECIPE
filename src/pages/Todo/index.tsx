import { Link } from 'react-router';
import ImagePlaceholder from '../../components/common/ImagePlaceholder';
import { useMockStore } from '../../hooks/useMockStore';

const TodoPage = () => {
  const { todo, recipes, markCooked, removeFromTodo } = useMockStore();

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">今週作る</h1>
      <p className="mt-1 mb-5 text-sm text-stone-500">
        {todo.length > 0 ? `${todo.length}品。作ったら「作った！」で履歴に移ります` : '作りたいものを入れておこう'}
      </p>

      {todo.length === 0 && (
        <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-sm shadow-stone-900/5">
          <p className="mb-1 text-4xl">🗒️</p>
          <p className="mb-4 text-stone-500">まだ何も入っていません</p>
          <Link to="/" className="inline-flex min-h-11 items-center rounded-full bg-brand px-5 font-bold text-white">
            レシピから選ぶ
          </Link>
        </div>
      )}

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {todo.map(item => {
          const recipe = recipes.find(r => r.id === item.recipeId);
          // レシピが消えていた場合（DB につないだら起こりうる）は表示しない
          if (!recipe) return null;
          return (
            <li key={item.id} className="flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-sm shadow-stone-900/5">
              <Link to={`/recipes/${recipe.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <ImagePlaceholder tags={recipe.tags} className="size-16 shrink-0 rounded-xl" emojiSize="text-3xl" />
                <div className="min-w-0">
                  <p className="truncate font-bold">{recipe.title}</p>
                  <p className="text-xs text-stone-500">{recipe.cookMinutes ? `⏱ ${recipe.cookMinutes}分` : ''}</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => removeFromTodo(item.id)}
                aria-label="リストから外す"
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-stone-400"
              >
                ✕
              </button>
              <button
                type="button"
                onClick={() => markCooked(item.id)}
                className="min-h-10 shrink-0 rounded-full bg-brand px-4 text-sm font-bold text-white"
              >
                作った！
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
};

export default TodoPage;
