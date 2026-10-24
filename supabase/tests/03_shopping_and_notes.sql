-- 買い物リスト（材料から追加）と共有メモ
set role authenticated;
select test.login('22222222-2222-2222-2222-222222222222');

select test.set('n', save_recipe(null, '肉じゃが', 40, 3, '{和食}', null,
  '[{"name":"牛こま","amount":"200g"},{"name":"じゃがいも","amount":"3個"},{"name":"しょうゆ"}]', null)::text);
select test.set('k', save_recipe(null, 'キーマカレー', 30, 2, '{洋食}', null,
  '[{"name":"じゃがいも","amount":"2個"},{"name":"カレールー","amount":"1箱"}]', null)::text);
insert into todo_items (recipe_id, planned_on) values (test.get('n'), current_date + 1), (test.get('n'), current_date + 4), (test.get('k'), null);

-- ほかのテストで入ったリクエストの分も足されるので、この2品の分だけを数える
select add_todo_ingredients_to_shopping();
select test.ok((select count(*) = 5 from shopping_items where recipe_id in (test.get('n'), test.get('k'))),
  '材料から追加：肉じゃが3 + キーマ2 = 5件（肉じゃがは2日入っていても1回分）');
select add_todo_ingredients_to_shopping();
select test.ok((select count(*) = 5 from shopping_items where recipe_id in (test.get('n'), test.get('k'))),
  'もう一度押しても、まだ買っていない同じものは重ならない');
update shopping_items set is_checked = true where name = 'カレールー' and recipe_id = test.get('k');
select add_todo_ingredients_to_shopping();
select test.ok((select count(*) = 6 from shopping_items where recipe_id in (test.get('n'), test.get('k'))),
  '買った（チェック）後なら、また追加される');

-- 共有メモ：1行だけ。読む・書き換えるはできる。増やす・消すはできない
update shared_notes set body = '日曜は外食';
select test.ok((select count(*) = 1 and bool_and(body = '日曜は外食') from shared_notes), '共有メモは1行で、書き換えられる');
select test.expect_error($$insert into shared_notes (id, body) values (1, 'x')$$, '42501', '共有メモの行は増やせない');
select test.expect_error($$delete from shared_notes$$, '42501', '共有メモは消せない');

reset role;
