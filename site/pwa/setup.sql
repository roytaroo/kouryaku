-- 攻略アプリ（全画面版）用の Supabase の準備。SQL Editor に貼って1回だけ実行する。
-- @KEY@ は minecraft/private/pwa_key.txt の中身（単語データの鍵）に置き換える。

create table if not exists public.kouryaku_docs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  col text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, col, id)
);
alter table public.kouryaku_docs enable row level security;
drop policy if exists "own docs" on public.kouryaku_docs;
create policy "own docs" on public.kouryaku_docs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table public.kouryaku_docs replica identity full;
grant select, insert, update, delete on public.kouryaku_docs to authenticated;
do $$ begin
  alter publication supabase_realtime add table public.kouryaku_docs;
exception when duplicate_object then null; end $$;

create table if not exists public.kouryaku_secret (id int primary key, k text not null);
alter table public.kouryaku_secret enable row level security;
drop policy if exists "read secret" on public.kouryaku_secret;
create policy "read secret" on public.kouryaku_secret for select to authenticated using (true);
grant select on public.kouryaku_secret to authenticated;
insert into public.kouryaku_secret (id, k) values (1, '@KEY@')
  on conflict (id) do update set k = excluded.k;
