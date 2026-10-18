import { BrowserRouter, Route, Routes } from 'react-router';

import MainLayout from './components/layout/MainLayout';
import { MockStoreProvider } from './contexts/MockStoreProvider';

// レシピ
import RecipeListPage from './pages/RecipeList';
import RecipeDetailPage from './pages/RecipeDetail';
import RecipeFormPage from './pages/RecipeForm';

// 今週作る
import TodoPage from './pages/Todo';

// メモ（買い物リスト・共有メモ）
import MemoPage from './pages/Memo';

// 作ったご飯（履歴）
import HistoryPage from './pages/History';

const App = () => {
  return (
    <MockStoreProvider>
      <BrowserRouter>
        <Routes>
          {/* 共通レイアウト（タブ付き）の中に各画面を表示する */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<RecipeListPage />} />
            <Route path="/recipes/new" element={<RecipeFormPage />} />
            <Route path="/recipes/:id" element={<RecipeDetailPage />} />
            <Route path="/recipes/:id/edit" element={<RecipeFormPage />} />
            <Route path="/todo" element={<TodoPage />} />
            <Route path="/memo" element={<MemoPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </MockStoreProvider>
  );
};

export default App;
