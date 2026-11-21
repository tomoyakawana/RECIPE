-- #13：レシピの削除（delete_recipe）と、削除したレシピへの「食べたい！」
set role authenticated;
select test.login('11111111-1111-1111-1111-111111111111');

-- 消すレシピ（ハンバーグ）と、残すレシピ（肉じゃが）
select test.set('hamburg', save_recipe(null, 'ハンバーグ', 40, 2, '{洋食}', null, null, null)::text);
select test.set('nikujaga', save_recipe(null, '肉じゃが', 30, 2, '{和食}', null, null, null)::text);

-- ハンバーグは、作った記録が1件・リクエストが2件（日付未定と日付あり）・買い物リストの品物が1件
insert into todo_items (recipe_id, planned_on) values (test.get('hamburg'), current_date - 1);
select mark_cooked((select id from todo_items where recipe_id = test.get('hamburg')));
insert into todo_items (recipe_id, planned_on) values (test.get('hamburg'), null), (test.get('hamburg'), current_date + 3);
insert into todo_items (recipe_id) values (test.get('nikujaga'));
insert into shopping_items (name, recipe_id) values ('合いびき肉', test.get('hamburg'));

select delete_recipe(test.get('hamburg'));
select test.ok((select deleted_at is not null from recipes where id = test.get('hamburg')), '削除すると deleted_at が入る（行は残る）');
select test.ok((select count(*) = 0 from todo_items where recipe_id = test.get('hamburg')), '…リクエストから外れる（日付未定も日付ありも）');
select test.ok((select count(*) = 1 from todo_items where recipe_id = test.get('nikujaga')), '…ほかのレシピのリクエストは消えない');
select test.ok((select count(*) = 1 from cook_logs where recipe_id = test.get('hamburg')), '…作ったご飯の記録は残る');
select test.ok((select count(*) = 1 from shopping_items where recipe_id = test.get('hamburg')), '…買い物リストの品物は残る');

select test.expect_error(format($$select delete_recipe(%L)$$, test.get('hamburg')), 'P0001', 'もう削除したレシピは、もう一度削除できない');
select test.expect_error($$select delete_recipe('99999999-9999-9999-9999-999999999999')$$, 'P0001', '存在しないレシピは削除できない');
select test.expect_error(format($$select request_recipe(%L)$$, test.get('hamburg')), 'P0001', '削除したレシピには「食べたい！」できない');
select test.ok((select count(*) = 0 from todo_items where recipe_id = test.get('hamburg')), '…そして、リクエストに入っていない');

-- 2人で共有しているので、奥さんも削除できる
select test.login('22222222-2222-2222-2222-222222222222');
select delete_recipe(test.get('nikujaga'));
select test.ok((select deleted_at is not null from recipes where id = test.get('nikujaga')), '相手が登録したレシピも削除できる');
reset role;

-- 未ログイン
set role anon;
select test.login(null);
select test.expect_error($$select delete_recipe('99999999-9999-9999-9999-999999999999')$$, '42501', '未ログインは削除できない');
reset role;
