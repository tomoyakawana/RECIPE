-- レシピ：保存（save_recipe）・お気に入り・ひとことメモ・論理削除
set role authenticated;
select test.login('11111111-1111-1111-1111-111111111111');

select test.set('r', save_recipe(null, '豚の生姜焼き', 20, 2, '{和食,豚肉}', null,
  '[{"name":"豚ロース","amount":"300g"},{"name":"玉ねぎ"}]', '{玉ねぎを切る,焼く}')::text);

select test.ok((select created_by = auth.uid() from recipes where id = test.get('r')), '作成者はログイン中のユーザー');
select test.ok((select count(*) = 2 from recipe_ingredients where recipe_id = test.get('r')), '材料が順番どおり2行入る');
select test.ok((select amount = '' from recipe_ingredients where recipe_id = test.get('r') and position = 1), '分量のない材料は空文字');
select test.ok((select count(*) = 2 from recipe_steps where recipe_id = test.get('r')), '手順が2行入る');
select test.ok(exists (select 1 from recipes where tags @> array['和食']), 'タグで絞り込める');

-- 編集
select test.ok(save_recipe(test.get('r'), '豚の生姜焼き（改）', 25, null, '{和食}', null,
  '[{"name":"豚肩ロース","amount":"250g"}]', '{焼く}') = test.get('r'), '編集しても id は同じ');
select test.ok((select count(*) = 1 from recipe_ingredients where recipe_id = test.get('r')), '編集で材料が入れ替わる');
select test.ok((select updated_at > created_at from recipes where id = test.get('r')), '編集で updated_at が更新される');

-- 途中で失敗したら全部取り消し（2行目の材料名が空 → check 違反）
select test.expect_error(format($$select save_recipe(%L, '壊れた更新', 1, 1, '{}', null, '[{"name":"ok"},{"name":""}]', '{x}')$$, test.get('r')),
  '23514', '途中で失敗したら、料理名の更新も含めて全部取り消し');
select test.ok((select title = '豚の生姜焼き（改）' from recipes where id = test.get('r')), '取り消し後も元の料理名のまま');
select test.expect_error($$select save_recipe('99999999-9999-9999-9999-999999999999', 'x', null, null, null, null, null, null)$$,
  'P0001', '存在しない id は編集できない');

-- お気に入りは夫婦共通、ひとことメモはフォームで保存しても消えない
update recipes set is_favorite = true, note = '玉ねぎ多め' where id = test.get('r');
select test.login('22222222-2222-2222-2222-222222222222');
select test.ok((select is_favorite from recipes where id = test.get('r')), 'お気に入りは相手からも見える（夫婦共通）');
select save_recipe(test.get('r'), '豚の生姜焼き（改）', 25, null, '{和食}', null, null, null);
select test.ok((select is_favorite and note = '玉ねぎ多め' from recipes where id = test.get('r')), 'フォームで保存しても、お気に入りとひとことメモは残る');

-- 論理削除したレシピは編集できない
update recipes set deleted_at = now() where id = test.get('r');
select test.expect_error(format($$select save_recipe(%L, 'x', null, null, null, null, null, null)$$, test.get('r')),
  'P0001', '論理削除したレシピは編集できない');

reset role;
