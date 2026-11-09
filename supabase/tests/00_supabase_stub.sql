-- =========================================================
-- テスト用の土台：本物の Supabase に近い環境を、素の PostgreSQL の中に作る
-- （マイグレーションより前に流す。本番の DB には流さないこと）
--
-- 再現しているもの
--   ・ロール：anon（未ログイン）／authenticated（ログイン済み）／service_role（サーバー側）
--   ・auth スキーマ：auth.users と auth.uid()（request.jwt.claim.sub からログイン中のユーザーを返す）
--   ・postgres ロールの既定の権限：anon などに TRUNCATE / REFERENCES / TRIGGER / MAINTAIN が付く
--     （2026-10-18 に本番の pg_default_acl で確認した anon=Dxtm と同じ）
--   ・テーブルへの select / insert などの自動付与はしない（2026-05-30 以降の新しいプロジェクトと同じ）
-- =========================================================

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

-- storage スキーマ（#14 写真）：マイグレーションがバケットとポリシーを作れるだけの最小限
-- 本物の Supabase では storage.buckets・storage.objects が最初からあり、objects の RLS も有効になっている
create schema storage;
create table storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean default false,
  file_size_limit    bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id        uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name      text
);
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
grant select, insert, delete on storage.objects to anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  grant truncate, references, trigger, maintain on tables to anon, authenticated, service_role;

-- テストに出てくる2人（川名さん・奥さん）
insert into auth.users values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');


-- ---------------------------------------------------------
-- テスト用の小さな道具（test スキーマ）
-- ---------------------------------------------------------
create schema test;
grant usage on schema test to anon, authenticated, service_role;

-- 条件が true なら PASS を表示、そうでなければ失敗としてエラーで止める
create function test.ok(p_cond boolean, p_desc text) returns void language plpgsql as $$
begin
  if p_cond is distinct from true then
    raise exception 'FAIL: %', p_desc;
  end if;
  raise notice 'PASS: %', p_desc;
end $$;

-- SQL を実行して、決まったエラー（SQLSTATE）になることを確かめる
--   42501 = 権限なし・RLS 違反／23505 = 一意制約違反／23503 = 外部キー違反／23514 = check 違反／P0001 = raise exception
create function test.expect_error(p_sql text, p_state text, p_desc text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlstate = p_state then
      raise notice 'PASS: % (%)', p_desc, sqlstate;
      return;
    end if;
    raise exception 'FAIL: % → 期待は %、実際は % (%)', p_desc, p_state, sqlstate, sqlerrm;
  end;
  raise exception 'FAIL: % → エラーにならなかった', p_desc;
end $$;

-- ログインしている人を切り替える（'' で未ログイン）
create function test.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), false)
$$;

-- テストの途中の値（作ったレシピの id など）を一時的に覚えておく
create function test.set(p_key text, p_val text) returns void language sql as $$
  select set_config('test.' || p_key, p_val, false)
$$;
create function test.get(p_key text) returns uuid language sql as $$
  select current_setting('test.' || p_key)::uuid
$$;
