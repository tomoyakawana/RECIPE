-- 権限：未ログイン（anon）は何もできない、使わない権限は外れている
set role anon;
select test.login(null);
select test.expect_error($$select count(*) from recipes$$, '42501', '未ログインはレシピを読めない');
select test.expect_error($$insert into recipes (title) values ('x')$$, '42501', '未ログインはレシピを作れない');
select test.expect_error($$select count(*) from shopping_items$$, '42501', '未ログインは買い物リストを読めない');
select test.expect_error($$select count(*) from shared_notes$$, '42501', '未ログインは共有メモを読めない');
select test.expect_error($$select save_recipe(null, 'x', null, null, null, null, null, null)$$, '42501', '未ログインは save_recipe を呼べない');
select test.expect_error($$select mark_cooked('99999999-9999-9999-9999-999999999999')$$, '42501', '未ログインは mark_cooked を呼べない');
select test.expect_error($$select add_todo_ingredients_to_shopping()$$, '42501', '未ログインは材料から追加を呼べない');
reset role;

set role authenticated;
select test.login('11111111-1111-1111-1111-111111111111');
select test.expect_error($$truncate public.recipes cascade$$, '42501', 'ログイン済みでも TRUNCATE はできない（RLS を無視して全部消せるため外した）');
select test.expect_error($$truncate public.shopping_items$$, '42501', 'ログイン済みでも買い物リストを TRUNCATE できない');
reset role;

-- 既定の権限：これから作るテーブルにも、anon / authenticated の不要な権限が付かない
select test.ok(not exists (
  select 1 from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace
   where n.nspname = 'public' and pg_get_userbyid(d.defaclrole) = 'postgres'
     and (d.defaclacl::text like '%anon=%' or d.defaclacl::text like '%authenticated=%')),
  'これから作るテーブルにも anon / authenticated の不要な権限が付かない');
select test.ok((select count(*) = 0 from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon'),
  'anon には、どのテーブルの権限もない');
select test.ok((select bool_and(rowsecurity) from pg_tables where schemaname = 'public'), 'すべてのテーブルで RLS が有効');
