import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router';

import RequireAuth from './components/common/RequireAuth';
import MainLayout from './components/layout/MainLayout';
import { AuthProvider } from './contexts/AuthProvider';
import { ToastProvider } from './contexts/ToastProvider';
import { queryClient } from './utils/queryClient';

// ログイン
import LoginPage from './pages/Login';

// レシピ
import RecipeListPage from './pages/RecipeList';
import RecipeDetailPage from './pages/RecipeDetail';
import RecipeFormPage from './pages/RecipeForm';

// リクエスト（URL・フォルダ名は「今週作る」だった頃の todo のまま）
import TodoPage from './pages/Todo';

// メモ（買い物リスト・共有メモ）
import MemoPage from './pages/Memo';

// 作ったご飯（履歴）
import HistoryPage from './pages/History';

// 設定
import SettingsPage from './pages/Settings';

const App = () => {
  return (
    <ToastProvider>
      {/* DB から読んだデータの置き場。ログアウト時に中身を消すので、AuthProvider より外側に置く */}
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* ログイン画面（レイアウトなし・ログイン不要） */}
              <Route path="/login" element={<LoginPage />} />

              {/* ここから下はログインが必要 */}
              <Route element={<RequireAuth />}>
                {/* 共通レイアウト（タブ付き）の中に各画面を表示する */}
                <Route element={<MainLayout />}>
                  <Route path="/" element={<RecipeListPage />} />
                  <Route path="/recipes/new" element={<RecipeFormPage />} />
                  <Route path="/recipes/:id" element={<RecipeDetailPage />} />
                  <Route path="/recipes/:id/edit" element={<RecipeFormPage />} />
                  <Route path="/todo" element={<TodoPage />} />
                  <Route path="/memo" element={<MemoPage />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ToastProvider>
  );
};

export default App;
