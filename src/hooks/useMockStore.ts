import { useContext } from 'react';
import { MockStoreContext, type MockStore } from '../contexts/mockStore';

/** モックのデータと操作を取り出す。MockStoreProvider の内側で使うこと */
export const useMockStore = (): MockStore => {
  const store = useContext(MockStoreContext);
  // ここで null を弾くと、以降 store は MockStore 型として扱える（TS の「型の絞り込み」）
  if (!store) throw new Error('useMockStore は MockStoreProvider の内側で使ってください');
  return store;
};
