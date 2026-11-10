-- 6/B RUN · global liderlik
-- Supabase paneli > SQL Editor > New query: hepsini yapıştırıp RUN.

create table if not exists public.scores (
  player_id text primary key check (char_length(player_id) between 1 and 64),
  name text not null check (char_length(name) between 1 and 15),
  dist integer not null check (dist >= 0 and dist < 1000000),
  coins integer not null default 0 check (coins >= 0),
  token text,
  updated_at timestamptz not null default now()
);

alter table public.scores add column if not exists token text;

create index if not exists scores_dist_idx on public.scores (dist desc, updated_at asc);

-- Daha önce 14 karakterle kurulduysa sınırı 15'e çıkar (yeniden çalıştırmak güvenli).
alter table public.scores drop constraint if exists scores_name_check;
alter table public.scores add constraint scores_name_check check (char_length(name) between 1 and 15);

alter table public.scores enable row level security;

drop policy if exists "scores read" on public.scores;
create policy "scores read" on public.scores for select using (true);

-- Oyuncu başına tek satır; sadece daha iyi skor eskisini geçer.
-- 5. parametre (token) eski istemcilerle uyum için varsayılanlı.
drop function if exists public.submit_score(text, text, integer, integer);
create or replace function public.submit_score(p_id text, p_name text, p_dist integer, p_coins integer, p_token text default null)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.scores (player_id, name, dist, coins, token)
  values (left(p_id, 64), left(p_name, 15), greatest(p_dist, 0), greatest(p_coins, 0), left(p_token, 64))
  on conflict (player_id) do update
    set name = case when excluded.dist > scores.dist then excluded.name else scores.name end,
        dist = greatest(scores.dist, excluded.dist),
        coins = case when excluded.dist > scores.dist then excluded.coins else scores.coins end,
        token = coalesce(scores.token, excluded.token),
        updated_at = now()
    where excluded.dist > scores.dist or scores.token is null;
$$;

revoke all on function public.submit_score(text, text, integer, integer, text) from public;
grant execute on function public.submit_score(text, text, integer, integer, text) to anon;

-- token sütunu API'den okunamasın (sadece oyuncunun kendi adını değiştirmesi için).
revoke select on public.scores from anon;
grant select (player_id, name, dist, coins, updated_at) on public.scores to anon;

-- Oyuncu kendi adını değiştirir. Cihazdaki gizli token ile doğrulanır.
create or replace function public.rename_me(p_id text, p_token text, p_name text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_rows int;
begin
  v_name := left(trim(p_name), 15);
  if v_name is null or char_length(v_name) < 2 then
    raise exception 'INVALID_NAME';
  end if;
  if p_id is null or p_token is null or char_length(p_token) < 16 then
    raise exception 'INVALID_TOKEN';
  end if;

  update public.scores
     set name = v_na
