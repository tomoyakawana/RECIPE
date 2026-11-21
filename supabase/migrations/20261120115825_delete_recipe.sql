-- =========================================================
-- レシピの削除（#13）
--   ① レシピを削除する関数 delete_recipe()
--   ② 「食べたい！」（request_recipe）で、削除したレシピを受け付けないようにする
-- =========================================================


-- ---------------------------------------------------------
-- ① レシピの削除（論理削除）
--   行は消さずに deleted_at に日時を入れる。作ったご飯の記録（cook_logs）から名前を引けるように残すため
--   あわせて、そのレシピのリクエスト（todo_items）を消す。
--   2つをフロントから別々に呼ぶと、片方だけ成功することがあるので、1つの関数（1つのトランザクション）にまとめる
--   買い物リストの品物・写真は残す（理由は docs/decisions/database.md）
-- ---------------------------------------------------------
create or replace function public.delete_recipe(p_recipe_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.recipes
     set deleted_at = now()
   where id = p_recipe_id
     and deleted_at is null;

  -- 1行も更新できなかった（見つからない・もう削除されている）ときは、エラーにする
  if not found then
    raise exception 'レシピ % が見つかりません（削除済みの可能性があります）', p_recipe_id;
  end if;

  delete from public.todo_items where recipe_id = p_recipe_id;
end;
$$;

revoke execute on function public.delete_recipe(uuid) from public, anon;
grant  execute on function public.delete_recipe(uuid) to authenticated, service_role;


-- ---------------------------------------------------------
-- ② 「食べたい！」：削除したレシピは受け付けない
--   もう1台のスマホで、古い画面のまま押された場合に備える。
--   for share でレシピの行を押さえるので、同じ瞬間に delete_recipe() が動いても、どちらかが待つ（すれ違わない）
--   ここ以外は、元の関数（20261024023439_add_requests_and_user_settings.sql）と同じ
-- ---------------------------------------------------------
create or replace function public.request_recipe(p_recipe_id uuid)
returns public.todo_items
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item public.todo_items;
begin
  perform 1
     from public.recipes
    where id = p_recipe_id
      and deleted_at is null
      for share;

  if not found then
    raise exception 'レシピ % が見つかりません（削除済みの可能性があります）', p_recipe_id;
  end if;

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
