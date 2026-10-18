-- =========================================================
-- 初期スキーマ：レシピ・材料・手順・お気に入り・今週作る・作った履歴・買い物リスト・共有メモ
--
-- 画面モック（src/types/*, src/contexts/mockStore.ts）から逆算したもの。
-- 利用者は夫婦2人のみ（新規登録は閉じる）なので、
-- 「ログインしている人は全データを読み書きできる」を基本の権限にする。
-- =========================================================


-- ---------------------------------------------------------
-- 共通：updated_at を自動で更新するトリガー関数
-- ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ---------------------------------------------------------
-- recipes：レシピ本体
-- ---------------------------------------------------------
create table public.recipes (
  id            uuid        primary key default gen_random_uuid(),
  title         text        not null check (char_length(title) between 1 and 100),
  cook_minutes  integer     check (cook_minutes > 0),
  servings      integer     check (servings > 0),
  -- タグは「ラベル」なので配列で持つ（絞り込みは tags @> array['和食']）
  tags          text[]      not null default '{}',
  -- お気に入り（夫婦共通。どちらかが付ければ2人ともお気に入り）
  is_favorite   boolean     not null default false,
  source_url    text,
  -- ひとことメモ（「玉ねぎ多めが好き」など）。詳細画面で直接書き換える。save_recipe では触らない
  note          text,
  -- 写真は Supabase Storage に置き、ここにはパスだけ持つ（写真機能を作るまでは null）
  image_path    text,
  created_by    uuid        not null default auth.uid() references auth.users (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- 論理削除。履歴（cook_logs）が参照しているので物理削除はしない
  deleted_at    timestamptz
);

comment on table  public.recipes            is 'レシピ本体';
comment on column public.recipes.tags       is 'タグ（和食・豚肉など）。絞り込み用';
comment on column public.recipes.note       is 'ひとことメモ（作るときのコツや好み）';
comment on column public.recipes.is_favorite is 'お気に入り（夫婦共通）';
comment on column public.recipes.image_path is 'Supabase Storage 上の写真のパス';
comment on column public.recipes.deleted_at is '論理削除日時。null なら有効';

create index recipes_tags_idx on public.recipes using gin (tags);

create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------
-- recipe_ingredients：材料（1行 = 1材料）
-- 別テーブルにしておくと、あとで「材料から検索」ができる
-- ---------------------------------------------------------
create table public.recipe_ingredients (
  id         uuid    primary key default gen_random_uuid(),
  recipe_id  uuid    not null references public.recipes (id) on delete cascade,
  -- 表示順（0 始まり）
  position   integer not null check (position >= 0),
  name       text    not null check (char_length(name) between 1 and 100),
  amount     text    not null default '',
  unique (recipe_id, position)
);

comment on table public.recipe_ingredients is 'レシピの材料';

create index recipe_ingredients_name_idx on public.recipe_ingredients (name);


-- ---------------------------------------------------------
-- recipe_steps：作り方（1行 = 1ステップ）
-- ---------------------------------------------------------
create table public.recipe_steps (
  id         uuid    primary key default gen_random_uuid(),
  recipe_id  uuid    not null references public.recipes (id) on delete cascade,
  position   integer not null check (position >= 0),
  body       text    not null check (char_length(body) >= 1),
  unique (recipe_id, position)
);

comment on table public.recipe_steps is 'レシピの作り方の各ステップ';


-- ---------------------------------------------------------
-- todo_items：今週作る
-- ---------------------------------------------------------
create table public.todo_items (
  id         uuid        primary key default gen_random_uuid(),
  recipe_id  uuid        not null references public.recipes (id) on delete cascade,
  -- 作る予定日。null なら「日付未定」
  planned_on date,
  added_by   uuid        not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  -- 同じレシピでも日付が違えば何度でも入れられる。同じ日に同じレシピは1つまで
  -- nulls not distinct：「日付未定」同士も重複とみなす（未定の同じレシピは1つまで）
  unique nulls not distinct (recipe_id, planned_on)
);

comment on table  public.todo_items            is '今週作るリスト（作る予定）';
comment on column public.todo_items.planned_on is '作る予定日。null なら日付未定';

create index todo_items_planned_on_idx on public.todo_items (planned_on);


-- ---------------------------------------------------------
-- cook_logs：作ったご飯（履歴）
-- ---------------------------------------------------------
create table public.cook_logs (
  id         uuid        primary key default gen_random_uuid(),
  -- レシピは論理削除なので restrict（履歴が残っているレシピは物理削除させない）
  recipe_id  uuid        not null references public.recipes (id) on delete restrict,
  -- DB のタイムゾーンは UTC なので、日本時間の日付を既定値にする
  cooked_on  date        not null default (now() at time zone 'Asia/Tokyo')::date,
  memo       text,
  cooked_by  uuid        not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

comment on table  public.cook_logs           is '作ったご飯の履歴';
comment on column public.cook_logs.cooked_on is '作った日（日本時間）';

create index cook_logs_cooked_on_idx on public.cook_logs (cooked_on desc);
create index cook_logs_recipe_id_idx on public.cook_logs (recipe_id);


-- ---------------------------------------------------------
-- shopping_items：買い物リスト
-- ---------------------------------------------------------
create table public.shopping_items (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null check (char_length(name) between 1 and 100),
  amount     text,
  -- 買ったら true
  is_checked boolean     not null default false,
  -- 「今週作るの材料から追加」で入ったときの元のレシピ。手入力なら null
  -- レシピが消えても買い物リストの行は残す（set null）
  recipe_id  uuid        references public.recipes (id) on delete set null,
  created_by uuid        not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

comment on table  public.shopping_items           is '買い物リスト';
comment on column public.shopping_items.recipe_id is '材料から追加したときの元レシピ。手入力なら null';


-- ---------------------------------------------------------
-- shared_notes：夫婦で共有するメモ（1枚だけ）
-- id を 1 に固定して、行が1つしか作れないようにする
-- ---------------------------------------------------------
create table public.shared_notes (
  id         smallint    primary key default 1 check (id = 1),
  body       text        not null default '',
  updated_by uuid        default auth.uid() references auth.users (id),
  updated_at timestamptz not null default now()
);

comment on table public.shared_notes is '共有メモ（1行だけ）';

create trigger shared_notes_set_updated_at
  before update on public.shared_notes
  for each row execute function public.set_updated_at();

-- 最初の1行を作っておく（アプリは常に update するだけでよい）
insert into public.shared_notes (id, body) values (1, '');


-- ---------------------------------------------------------
-- 「作った！」：今週作るから外して、履歴に追加する（1トランザクション）
-- フロントから2回に分けて呼ぶと、片方だけ成功することがあるので関数にまとめる
-- 記録する日付：予定日が今日以前ならその予定日（押し忘れ対策）、未来・未定なら今日（日本時間）
-- ---------------------------------------------------------
create or replace function public.mark_cooked(p_todo_id uuid)
returns public.cook_logs
language plpgsql
-- 呼び出した人の権限で動かす（RLS がそのまま効く）
security invoker
set search_path = ''
as $$
declare
  v_recipe_id  uuid;
  v_planned_on date;
  v_today      date := (now() at time zone 'Asia/Tokyo')::date;
  v_log        public.cook_logs;
begin
  delete from public.todo_items
   where id = p_todo_id
  returning recipe_id, planned_on into v_recipe_id, v_planned_on;

  if v_recipe_id is null then
    raise exception 'todo_item % が見つかりません', p_todo_id;
  end if;

  insert into public.cook_logs (recipe_id, cooked_on)
  values (
    v_recipe_id,
    case when v_planned_on is not null and v_planned_on <= v_today then v_planned_on else v_today end
  )
  returning * into v_log;

  return v_log;
end;
$$;


-- ---------------------------------------------------------
-- レシピの保存（追加・編集）：recipes / 材料 / 手順 の3テーブルを1トランザクションで書く
--   p_recipe_id が null → 追加、値あり → そのレシピを編集
--   材料・手順は「全部消して入れ直す」（差分更新より単純。材料・手順の行を参照するテーブルはない）
--   p_ingredients：[{"name": "豚ロース", "amount": "300g"}, ...]（配列の順番 = 表示順）
--   p_steps      ：['玉ねぎを切る', ...]（配列の順番 = 手順の順番）
-- 戻り値：保存したレシピの id
-- ---------------------------------------------------------
create or replace function public.save_recipe(
  p_recipe_id    uuid,
  p_title        text,
  p_cook_minutes integer,
  p_servings     integer,
  p_tags         text[],
  p_source_url   text,
  p_ingredients  jsonb,
  p_steps        text[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_recipe_id uuid;
begin
  if p_recipe_id is null then
    insert into public.recipes (title, cook_minutes, servings, tags, source_url)
    values (p_title, p_cook_minutes, p_servings, coalesce(p_tags, '{}'), p_source_url)
    returning id into v_recipe_id;
  else
    update public.recipes
       set title        = p_title,
           cook_minutes = p_cook_minutes,
           servings     = p_servings,
           tags         = coalesce(p_tags, '{}'),
           source_url   = p_source_url
     where id = p_recipe_id
       and deleted_at is null
    returning id into v_recipe_id;

    if v_recipe_id is null then
      raise exception 'レシピ % が見つかりません（削除済みの可能性があります）', p_recipe_id;
    end if;

    delete from public.recipe_ingredients where recipe_id = v_recipe_id;
    delete from public.recipe_steps       where recipe_id = v_recipe_id;
  end if;

  -- with ordinality：配列の何番目か（1 始まり）を一緒に取り出す → position は 0 始まりにする
  insert into public.recipe_ingredients (recipe_id, position, name, amount)
  select v_recipe_id, (i.ord - 1)::integer, i.elem ->> 'name', coalesce(i.elem ->> 'amount', '')
    from jsonb_array_elements(coalesce(p_ingredients, '[]'::jsonb)) with ordinality as i (elem, ord);

  insert into public.recipe_steps (recipe_id, position, body)
  select v_recipe_id, (s.ord - 1)::integer, s.body
    from unnest(coalesce(p_steps, '{}')) with ordinality as s (body, ord);

  return v_recipe_id;
end;
$$;


-- ---------------------------------------------------------
-- 今週作るに入っているレシピの材料を、買い物リストに追加する
--   同じレシピが複数の日に入っていても1回分として扱う
--   同じレシピの同じ材料が、まだ買っていない状態で入っていれば重ねて入れない
--   （冷蔵庫にあるものもあるので、自動ではなくボタンを押したときだけ呼ぶ）
-- 戻り値：追加した件数
-- ---------------------------------------------------------
create or replace function public.add_todo_ingredients_to_shopping()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.shopping_items (name, amount, recipe_id)
  select i.name, nullif(i.amount, ''), i.recipe_id
    from (select distinct recipe_id from public.todo_items) t
    join public.recipe_ingredients i on i.recipe_id = t.recipe_id
   where not exists (
           select 1
             from public.shopping_items s
            where s.recipe_id = i.recipe_id
              and s.name      = i.name
              and not s.is_checked
         )
   order by i.recipe_id, i.position;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;


-- ---------------------------------------------------------
-- 権限（GRANT）
-- 2026-05-30 以降の新しい Supabase プロジェクトでは、public のテーブルに権限が自動で付かない。
-- テーブルごとに明示的に付ける（付けないと supabase-js から一切読めない）。
-- 参考：https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
--
-- anon（未ログイン）には何も付けない。authenticated（ログイン済み）に必要な分だけ付ける。
-- service_role はサーバー側（Edge Functions など）用。
-- どの行に触れるかは、この後の RLS で絞る（GRANT と RLS は別の層）。
-- ---------------------------------------------------------
grant select, insert, update, delete on
  public.recipes,
  public.recipe_ingredients,
  public.recipe_steps,
  public.todo_items,
  public.cook_logs,
  public.shopping_items
to authenticated, service_role;

-- 共有メモは1行固定なので、読み取りと更新だけ
grant select, update on public.shared_notes to authenticated;
grant select, insert, update, delete on public.shared_notes to service_role;

-- 関数は PostgreSQL の既定で誰でも（PUBLIC）実行できるので、いったん外してから付け直す
revoke execute on function
  public.mark_cooked(uuid),
  public.save_recipe(uuid, text, integer, integer, text[], text, jsonb, text[]),
  public.add_todo_ingredients_to_shopping()
from public, anon;

grant execute on function
  public.mark_cooked(uuid),
  public.save_recipe(uuid, text, integer, integer, text[], text, jsonb, text[]),
  public.add_todo_ingredients_to_shopping()
to authenticated, service_role;


-- ---------------------------------------------------------
-- RLS（行レベルセキュリティ）
-- 未ログイン（anon）は何もできない。ログイン済み（authenticated）は全件読み書きできる。
-- 共有メモだけは1行固定なので、読むことと書き換えることだけ許す
-- ---------------------------------------------------------
alter table public.recipes            enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps       enable row level security;
alter table public.todo_items         enable row level security;
alter table public.cook_logs          enable row level security;
alter table public.shopping_items     enable row level security;
alter table public.shared_notes       enable row level security;

create policy "ログイン済みは全操作可" on public.recipes
  for all to authenticated using (true) with check (true);

create policy "ログイン済みは全操作可" on public.recipe_ingredients
  for all to authenticated using (true) with check (true);

create policy "ログイン済みは全操作可" on public.recipe_steps
  for all to authenticated using (true) with check (true);

create policy "ログイン済みは全操作可" on public.todo_items
  for all to authenticated using (true) with check (true);

create policy "ログイン済みは全操作可" on public.cook_logs
  for all to authenticated using (true) with check (true);

create policy "ログイン済みは全操作可" on public.shopping_items
  for all to authenticated using (true) with check (true);

-- 共有メモは1行固定なので、読むことと書き換えることだけ許す（追加・削除はさせない）
create policy "ログイン済みは読める" on public.shared_notes
  for select to authenticated using (true);

create policy "ログイン済みは書き換えられる" on public.shared_notes
  for update to authenticated using (true) with check (true);
