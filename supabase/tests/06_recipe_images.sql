-- #14：写真のバケットの権限（storage.objects の RLS）と、save_recipe の写真のパス
set role authenticated;
select test.login('11111111-1111-1111-1111-111111111111');

-- save_recipe：写真のパスを入れる・差し替える・なくす
select test.set('r', save_recipe(null, '肉じゃが', 30, 2, '{和食}', null, null, null, 'a/large.jpg')::text);
select test.ok((select image_path = 'a/large.jpg' from recipes where id = test.get('r')), '追加のときに写真のパスが入る');
select save_recipe(test.get('r'), '肉じゃが', 30, 2, '{和食}', null, null, null, 'b/large.jpg');
select test.ok((select image_path = 'b/large.jpg' from recipes where id = test.get('r')), '編集で写真を差し替えられる');
select save_recipe(test.get('r'), '肉じゃが', 30, 2, '{和食}', null, null, null);
select test.ok((select image_path is null from recipes where id = test.get('r')), '写真のパスを渡さなければ写真なしになる（今のアプリから呼んでも動く）');

-- ログイン済みは、写真のバケットに上げる・見る・消すができる
insert into storage.objects (bucket_id, name) values ('recipe-images', 'test/large.jpg');
select test.ok((select count(*) = 1 from storage.objects where name = 'test/large.jpg'), 'ログイン済みは写真を上げて、見られる');
delete from storage.objects where name = 'test/large.jpg';
select test.ok((select count(*) = 0 from storage.objects where name = 'test/large.jpg'), 'ログイン済みは写真を消せる');

-- 写真のバケットの外には上げられない（バケットを作るのは管理者に戻ってから）
reset role;
insert into storage.buckets (id, name) values ('other', 'other');
set role authenticated;
select test.expect_error($$insert into storage.objects (bucket_id, name) values ('other', 'x.jpg')$$, '42501', 'ほかのバケットには上げられない');

-- 未ログインは、見る・上げる・消すのどれもできない
insert into storage.objects (bucket_id, name) values ('recipe-images', 'keep/large.jpg');
set role anon;
select test.login(null);
select test.ok((select count(*) = 0 from storage.objects), '未ログインは写真を見られない');
select test.expect_error($$insert into storage.objects (bucket_id, name) values ('recipe-images', 'x.jpg')$$, '42501', '未ログインは写真を上げられない');
delete from storage.objects;
reset role;
select test.ok((select count(*) = 1 from storage.objects where name = 'keep/large.jpg'), '未ログインは写真を消せない');
