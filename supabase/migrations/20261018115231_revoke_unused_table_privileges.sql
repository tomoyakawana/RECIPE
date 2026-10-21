-- =========================================================
-- アプリで使わないテーブル権限を外す
--
-- Supabase は anon（未ログイン）と authenticated（ログイン済み）に、
-- TRUNCATE / REFERENCES / TRIGGER / MAINTAIN を既定で付けている
-- （初期スキーマ適用後、pg_default_acl で postgres ロールの既定値が anon=Dxtm であることを確認）。
--   TRUNCATE  ：RLS を無視して全行を一括で消せる
--   REFERENCES：そのテーブルを参照する外部キーを作れる
--   TRIGGER   ：そのテーブルにトリガーを作れる
--   MAINTAIN  ：テーブルのロック（LOCK TABLE）や VACUUM / ANALYZE などができる（PostgreSQL 17 から）
-- アプリ（supabase-js / Data API）ではどれも使わないので、念のため外しておく。
-- service_role（サーバー側の管理用）は対象外。
-- =========================================================

-- 今あるテーブルから外す
revoke truncate, references, trigger, maintain on all tables in schema public from anon, authenticated;

-- これから作るテーブルにも、最初から付かないようにする
-- （マイグレーションは postgres ロールで実行されるので、postgres が作るテーブルの既定値を変える）
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger, maintain on tables from anon, authenticated;
