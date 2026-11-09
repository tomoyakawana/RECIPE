-- =========================================================
-- #14 レシピに写真を付ける
--   ① 写真を置くバケット（recipe-images）と、その権限
--   ② save_recipe に写真のパス（p_image_path）を足す
-- =========================================================


-- ---------------------------------------------------------
-- ① 写真を置くバケット
--   非公開（public = false）：URL を知っていても、ログインしていなければ見られない
--   1ファイル 5MB まで、JPEG だけ（アプリ側で縮小して JPEG にしてから上げるので、それ以外は来ないはず）
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-images', 'recipe-images', false, 5242880, array['image/jpeg']);


-- ---------------------------------------------------------
-- 写真の権限（storage.objects の RLS）
--   Storage のファイルは、storage.objects というテーブルの1行として管理される。RLS は Supabase が最初から有効にしている
--   ポリシーがなければ誰も読み書きできないので、ログイン済み（authenticated）にだけ、このバケットの分を許す
--   未ログイン（anon）には何も付けない
--   update は付けない（差し替えるときは、新しい名前で上げて古いものを消すので、上書きしない）
-- ---------------------------------------------------------
create policy "ログイン済みは写真を見られる" on storage.objects
  for select to authenticated
  using (bucket_id = 'recipe-images');

create policy "ログイン済みは写真を上げられる" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recipe-images');

create policy "ログイン済みは写真を消せる" on storage.objects
  for delete to authenticated
  using (bucket_id = 'recipe-images');


-- ---------------------------------------------------------
-- ② save_recipe に写真のパス（p_image_path）を足す
--   引数が変わると「別の関数」として増えてしまうので、古い方を消してから作り直す
--   p_image_path は既定値 null：本番の DB を先に変えても、今のアプリ（写真を渡さない）がそのまま動くように
--   写真のパスは、詳細用（1200px）のもの。一覧用（400px）は同じ名前の決まりで、アプリ側で組み立てる
-- ---------------------------------------------------------
drop function public.save_recipe(uuid, text, integer, integer, text[], text, jsonb, text[]);

-- ---------------------------------------------------------
-- レシピの保存（追加・編集）：recipes / 材料 / 手順 の3テーブルを1トランザクションで書く
--   p_recipe_id が null → 追加、値あり → そのレシピを編集
--   材料・手順は「全部消して入れ直す」（差分更新より単純。材料・手順の行を参照するテーブルはない）
--   p_ingredients：[{"name": "豚ロース", "amount": "300g"}, ...]（配列の順番 = 表示順）
--   p_steps      ：['玉ねぎを切る', ...]（配列の順番 = 手順の順番）
--   p_image_path ：写真のパス（詳細用）。null なら写真なし。編集のときも、渡した値で置き換える
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
  p_steps        text[],
  p_image_path   text default null
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
    insert into public.recipes (title, cook_minutes, servings, tags, source_url, image_path)
    values (p_title, p_cook_minutes, p_servings, coalesce(p_tags, '{}'), p_source_url, p_image_path)
    returning id into v_recipe_id;
  else
    update public.recipes
       set title        = p_title,
           cook_minutes = p_cook_minutes,
           servings     = p_servings,
           tags         = coalesce(p_tags, '{}'),
           source_url   = p_source_url,
           image_path   = p_image_path
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

-- 作り直すと権限も消えるので、付け直す（PostgreSQL の既定では誰でも実行できるので、外してから付ける）
revoke execute on function
  public.save_recipe(uuid, text, integer, integer, text[], text, jsonb, text[], text)
from public, anon;

grant execute on function
  public.save_recipe(uuid, text, integer, integer, text[], text, jsonb, text[], text)
to authenticated, service_role;

