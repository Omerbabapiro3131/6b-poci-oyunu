-- 6/B RUN · global liderlik
-- Supabase paneli > SQL Editor > New query: hepsini yapıştırıp RUN.

create table if not exists public.scores (
  player_id text primary key check (char_length(player_id) between 1 and 64),
  name text not null check (char_length(name) between 1 and 14),
  dist integer not null check (dist >= 0 and dist < 1000000),
  coins integer not null default 0 check (coins >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists scores_dist_idx on public.scores (dist desc, updated_at asc);

alter table public.scores enable row level security;

drop policy if exists "scores read" on public.scores;
create policy "scores read" on public.scores for select using (true);

-- Oyuncu başına tek satır; sadece daha iyi skor eskisini geçer.
create or replace function public.submit_score(p_id text, p_name text, p_dist integer, p_coins integer)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.scores (player_id, name, dist, coins)
  values (left(p_id, 64), left(p_name, 14), greatest(p_dist, 0), greatest(p_coins, 0))
  on conflict (player_id) do update
    set name = excluded.name,
        dist = excluded.dist,
        coins = excluded.coins,
        updated_at = now()
    where excluded.dist > scores.dist;
$$;

revoke all on function public.submit_score(text, text, integer, integer) from public;
grant execute on function public.submit_score(text, text, integer, integer) to anon;
grant select on public.scores to anon;
