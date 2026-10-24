#!/usr/bin/env bash
# =========================================================
# SQL のテストを流す
#   Docker で素の PostgreSQL 17 を立ち上げ、
#   00_supabase_stub.sql（Supabase に近い環境）→ マイグレーション全部 → テスト（01_ 以降）の順に流す。
#   どれか1つでも合わなければ、その場で止まって終了コードが 1 になる。
#
# 使い方：bash supabase/tests/run.sh
# 必要なもの：Docker、psql
# 本番の Supabase には一切つながない
# =========================================================
set -euo pipefail

cd "$(dirname "$0")/../.."

NAME=recipe-sqltest
PORT=55432
export PGPASSWORD=pw

cleanup() { docker stop "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --rm --name "$NAME" -e POSTGRES_PASSWORD=pw -p "$PORT:5432" postgres:17 >/dev/null
for _ in $(seq 1 30); do
  psql -h localhost -p "$PORT" -U postgres -c 'select 1' >/dev/null 2>&1 && break
  sleep 1
done

run() {
  local out status
  # -X：個人の psql の設定を読まない ／ ON_ERROR_STOP：エラーで止める ／ -q：余計な表示を減らす
  # 先に psql の終了コードを受け取ってから、表示だけを絞る
  # （パイプの後ろに `|| true` を付けると、psql ではなく true の結果を見てしまい、失敗を見逃す）
  out=$(psql -X -q -h localhost -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -f "$1" 2>&1) && status=0 || status=$?
  printf '%s\n' "$out" | grep -E 'PASS|FAIL|ERROR' | sed 's/^psql:[^ ]* //' || true
  return "$status"
}

echo "▶ 00_supabase_stub.sql"
run supabase/tests/00_supabase_stub.sql

for f in supabase/migrations/*.sql; do
  echo "▶ migration: $(basename "$f")"
  run "$f"
done

status=0
for f in supabase/tests/[0-9][0-9]_*.sql; do
  [ "$(basename "$f")" = "00_supabase_stub.sql" ] && continue
  echo "▶ $(basename "$f")"
  if ! run "$f"; then
    status=1
    echo "✖ $(basename "$f") で失敗"
  fi
done

if [ "$status" -eq 0 ]; then echo "✔ すべてのテストが通りました"; else echo "✖ 失敗したテストがあります"; fi
exit "$status"
