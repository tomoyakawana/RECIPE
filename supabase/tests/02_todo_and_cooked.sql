-- リクエスト（todo_items）の重複ルールと「作った！」（mark_cooked）
set role authenticated;
select test.login('11111111-1111-1111-1111-111111111111');

select test.set('c', save_recipe(null, 'カレー', 60, 4, '{洋食}', null, null, null)::text);

-- 重複のルール：同じ料理でも日付が違えば何度でも。同じ日・日付未定同士は1つまで
insert into todo_items (recipe_id, planned_on) values (test.get('c'), current_date + 2), (test.get('c'), current_date + 5);
select test.ok((select count(*) = 2 from todo_items where recipe_id = test.get('c')), '同じ料理を別の日に2回入れられる');
select test.expect_error(format($$insert into todo_items (recipe_id, planned_on) values (%L, current_date + 2)$$, test.get('c')),
  '23505', '同じ日に同じ料理は入れられない');
insert into todo_items (recipe_id) values (test.get('c'));
select test.expect_error(format($$insert into todo_items (recipe_id) values (%L)$$, test.get('c')),
  '23505', '日付未定の同じ料理は1つまで');

-- 作った！の日付：予定日が今日以前ならその予定日、未来・未定なら今日（日本時間）
insert into todo_items (recipe_id, planned_on) values (test.get('c'), current_date - 3);
select test.ok((select cooked_on = current_date - 3 from mark_cooked(
  (select id from todo_items where recipe_id = test.get('c') and planned_on = current_date - 3))), '過去の予定日 → その予定日で記録');
select test.ok((select cooked_on = (now() at time zone 'Asia/Tokyo')::date from mark_cooked(
  (select id from todo_items where recipe_id = test.get('c') and planned_on = current_date + 5))), '未来の予定日 → 今日で記録');
select test.ok((select cooked_on = (now() at time zone 'Asia/Tokyo')::date from mark_cooked(
  (select id from todo_items where recipe_id = test.get('c') and planned_on is null))), '日付未定 → 今日で記録');
select test.ok((select count(*) = 1 from todo_items where recipe_id = test.get('c')), '作った！で、リクエストから外れる');
select test.expect_error($$select mark_cooked('99999999-9999-9999-9999-999999999999')$$, 'P0001', '存在しないリクエストは作った！にできない');

-- 履歴があるレシピは物理削除できない（論理削除で消す）
select test.expect_error(format($$delete from recipes where id = %L$$, test.get('c')), '23503', '履歴があるレシピは物理削除できない');

reset role;
