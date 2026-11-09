import { resizeImageToBlob } from '../utils/image';
import { supabase } from '../utils/supabaseClient';

/**
 * レシピの写真（Storage の recipe-images バケット）
 *
 * 1枚の写真につき、詳細用（長い辺 1200px）と一覧用（400px）の2つを、同じフォルダーに置く
 *   例：3f2a…/large.jpg と 3f2a…/small.jpg
 * DB（recipes.image_path）に入れるのは詳細用のパスだけ。一覧用のパスは、ここで組み立てる
 */

const BUCKET = 'recipe-images';

// 署名付き URL の有効期限（秒）。画面を開いている間に切れない長さにする
const URL_EXPIRES_IN = 60 * 60;

/** 詳細用のパス → 一覧用のパス */
export const toSmallPath = (path: string): string => path.replace(/large\.jpg$/, 'small.jpg');

/**
 * 写真を縮小して2つ上げる。詳細用のパスを返す（save_recipe に渡す）
 * フォルダー名は毎回新しく作る（差し替えるときも上書きせず、別の名前で上げる）
 */
export const uploadRecipeImage = async (file: File): Promise<string> => {
  const [large, small] = await Promise.all([resizeImageToBlob(file, 1200), resizeImageToBlob(file, 400)]);
  const largePath = `${crypto.randomUUID()}/large.jpg`;

  const storage = supabase.storage.from(BUCKET);
  const { error: largeError } = await storage.upload(largePath, large, { contentType: 'image/jpeg' });
  if (largeError) throw largeError;

  const { error: smallError } = await storage.upload(toSmallPath(largePath), small, { contentType: 'image/jpeg' });
  if (smallError) {
    // 片方だけ残らないように、先に上げた方を消してから失敗にする
    await storage.remove([largePath]);
    throw smallError;
  }
  return largePath;
};

/** 写真を消す（詳細用・一覧用の両方）。差し替え・削除して要らなくなった写真に使う */
export const removeRecipeImage = async (path: string): Promise<void> => {
  const { error } = await supabase.storage.from(BUCKET).remove([path, toSmallPath(path)]);
  if (error) throw error;
};

/**
 * 写真を表示するための URL（期限付き）を、まとめて取る
 * 非公開のバケットなので、ログイン中のユーザーとして URL を発行してもらう
 * 返り値：パス → URL の Map
 */
export const fetchImageUrls = async (paths: string[]): Promise<Map<string, string>> => {
  if (paths.length === 0) return new Map();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, URL_EXPIRES_IN);
  if (error) throw error;
  return new Map(data.flatMap(d => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [])));
};
