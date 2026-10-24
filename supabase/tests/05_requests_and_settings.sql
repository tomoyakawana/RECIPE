-- #18：「食べたい！」（request_recipe）、ユーザーごとの設定（user_settings）、set_updated_at の権限
set role authenticated;

-- 奥さんがレシピを登録して、カレーを日付未定でリクエストに入れる
select test.login('22222222-2222-2222-2222-222222222222');
select test.set('curry', save_recipe(null, 'バターチキンカレー', 60, 4, '{洋食}', null, null, null)::text);
select test.set('oyako', save_recipe(null, '親子丼', 20, 2, '{和食}', null, null, null)::text);
insert into todo_items (recipe_id) values (test.get('curry'));

-- 川名さんが「食べたい！」
select test.login('11111111-1111-1111-1111-111111111111');
select test.ok((request_recipe(test.get('curry'))).requested_by = auth.uid(), '奥さんが入れた日付未定の料理に「食べたい！」→ 印が付く');
select test.ok((select count(*) = 1 and count(requested_by) = 1 from todo_items where recipe_id = test.get('curry')), '…そして、行は増えない');
select test.ok((select added_by = '22222222-2222-2222-2222-222222222222' from todo_items where recipe_id = test.get('curry')), '…追加した人（奥さん）は変わらない');

select test.ok((request_recipe(test.get('oyako'))).requested_by = auth.uid(), 'リクエストにない料理に「食べたい！」→ 印付きで追加');
select request_recipe(test.get('oyako'));
select test.ok((select count(*) = 1 from todo_items where recipe_id = test.get('oyako')), '同じ料理にもう一度「食べたい！」しても増えない');

-- 奥さんが親子丼に日付を入れた後、川名さんがまた「食べたい！」→ 予定は動かさず、日付未定の行が新しくできる
select test.login('22222222-2222-2222-2222-222222222222');
update todo_items set planned_on = current_date + 2 where recipe_id = test.get('oyako');
select test.login('11111111-1111-1111-1111-111111111111');
select request_recipe(test.get('oyako'));
select test.ok((select count(*) = 2 and count(*) filter (where planned_on is null) = 1 from todo_items where recipe_id = test.get('oyako')),
  '日付が決まった後の「食べたい！」は、予定を動かさずに日付未定の行を足す');

-- user_settings：自分の行だけ
insert into user_settings (secret_mode) values (true);
select test.ok((select user_id = auth.uid() and secret_mode from user_settings), '自分の設定を作れる（user_id は自動で自分）');
update user_settings set secret_mode = false;
select test.ok((select not secret_mode from user_settings), '自分の設定を変えられる');
select test.ok((select updated_at > (now() - interval '1 minute') from user_settings), '更新すると updated_at がトリガーで変わる（set_updated_at はトリガーとしては動く）');

select test.login('22222222-2222-2222-2222-222222222222');
select test.ok((select count(*) = 0 from user_settings), '相手の設定は見えない');
update user_settings set secret_mode = true where user_id = '11111111-1111-1111-1111-111111111111';
select test.expect_error($$insert into user_settings (user_id, secret_mode) values ('11111111-1111-1111-1111-111111111111', true)$$,
  '42501', '相手の設定は作れない');
select test.expect_error($$delete from user_settings$$, '42501', '設定は消せない（GRANT していない）');
insert into user_settings (secret_mode) values (false);
select test.ok((select count(*) = 1 from user_settings), '奥さんも自分の設定なら作れる');
reset role;
select test.ok((select not secret_mode from user_settings where user_id = '11111111-1111-1111-1111-111111111111'),
  '奥さんの update は、川名さんの設定に効いていない');

-- 未ログイン
set role anon;
select test.login(null);
select test.expect_error($$select count(*) from user_settings$$, '42501', '未ログインは設定を読めない');
select test.expect_error($$select request_recipe('99999999-9999-9999-9999-999999999999')$$, '42501', '未ログインは「食べたい！」できない');
reset role;

-- set_updated_at はトリガー専用。直接は誰も実行できない
select test.ok(not has_function_privilege('authenticated', 'public.set_updated_at()', 'execute')
           and not has_function_privilege('anon', 'public.set_updated_at()', 'execute'),
  'set_updated_at は anon・authenticated から直接実行できない');
