-- =========================================================
-- #18 DB への差し替えに必要なスキーマを追加
--   ① 「🙋 食べたい！」をした人（todo_items.requested_by）と、それを付ける関数 request_recipe()
--   ② ユーザーごとの設定（user_settings：シークレットモード）
--   ③ 権限の整理（set_updated_at の実行権限を外す）
-- =========================================================


-- ---------------------------------------------------------
-- ① 「食べたい！」をした人
--   null なら印なし。奥さんが入れた料理に、川名さんが後から「食べたい！」を付けることがあるので、
--   追加した人（added_by）とは別の列で持つ
-- ---------------------------------------------------------
alter table public.todo_items
  add column requested_by uuid references auth.users (id) on delete set null;

comment on column public.todo_items.requested_by is '「食べたい！」をした人。null なら印なし';


-- 「食べたい！」：同じ料理の日付未定がすでにあれば、増やさずにその1件に印を付ける。なければ、印付きで追加する
-- フロントから「探す → 追加か更新」を2回に分けると、2人が同時に押したときにずれるので、1つの関数にまとめる
-- 戻り値：印を付けた（または追加した）todo_items の行
create or replace function public.request_recipe(p_recipe_id uuid)
returns public.todo_items
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item public.todo_items;
begin
  -- 日付未定の同じ料理が1件あるか（unique nulls not distinct なので、あっても1件だけ）
  update public.todo_items
     set requested_by = (select auth.uid())
   where recipe_id  = p_recipe_id
     and planned_on is null
  returning * into v_item;

  if v_item.id is null then
    insert into public.todo_items (recipe_id, requested_by)
    values (p_recipe_id, (select auth.uid()))
    returning * into v_item;
  end if;

  return v_item;
end;
$$;


-- ---------------------------------------------------------
-- ② ユーザーごとの設定（1ユーザー1行）
--   行は、設定を初めて変えたときに作る（行がなければ、すべて既定値とみなす）。
--   auth スキーマにトリガーを足す方法もあるが、Supabase の内部に手を入れるので避ける
-- ---------------------------------------------------------
create table public.user_settings (
  user_id     uuid        primary key default auth.uid() references auth.users (id) on delete cascade,
  -- シークレットモード：オンなら「リクエスト」のタブを出さない（予定を見ないためのモード）
  secret_mode boolean     not null default false,
  updated_at  timestamptz not null default now()
);

comment on table  public.user_settings             is 'ユーザーごとの設定（1ユーザー1行。行がなければ既定値）';
comment on column public.user_settings.secret_mode is 'シークレットモード（オンならリクエストのタブを出さない）';

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------
-- 権限（GRANT）：初期スキーマと同じく、anon には付けない
-- ---------------------------------------------------------
-- user_settings は、読む・作る・変えるだけ（消す必要はない）
grant select, insert, update on public.user_settings to authenticated;
grant select, insert, update, delete on public.user_settings to service_role;

revoke execute on function public.request_recipe(uuid) from public, anon;
grant  execute on function public.request_recipe(uuid) to authenticated, service_role;

-- ③ set_updated_at はトリガー専用。直接呼ぶ必要はないので、実行権限を外す
--   （トリガーとして動くときは、この権限は確認されないので影響しない）
revoke execute on function public.set_updated_at() from public, anon, authenticated;


-- ---------------------------------------------------------
-- RLS：自分の設定だけ（相手の設定は見えない・変えられない）
-- ---------------------------------------------------------
alter table public.user_settings enable row level security;

create policy "自分の設定だけ読める" on public.user_settings
  for select to authenticated using (user_id = (select auth.uid()));

create policy "自分の設定だけ作れる" on public.user_settings
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "自分の設定だけ変えられる" on public.user_settings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
