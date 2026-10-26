-- Comptes Kikory : identifiant + mot de passe, données de chaque personne sauvegardées en ligne.
-- À coller une seule fois dans Supabase > SQL Editor > New query, puis « Run ».
-- Les tables ne sont pas lisibles directement : tout passe par les fonctions ci-dessous.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.kikory_users (
  id uuid primary key default gen_random_uuid(),
  pseudo text not null unique check (pseudo ~ '^[a-z0-9._-]{3,24}$'),
  pass_hash text not null,
  data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kikory_sessions (
  token_hash text primary key,
  user_id uuid not null references public.kikory_users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.kikory_users enable row level security;
alter table public.kikory_sessions enable row level security;
revoke all on public.kikory_users, public.kikory_sessions from anon, authenticated;

-- Jeton de session aléatoire ; seule son empreinte est stockée.
create or replace function public.kikory_new_session(p_user uuid) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  t text := encode(gen_random_bytes(32), 'hex');
begin
  insert into kikory_sessions (token_hash, user_id) values (encode(digest(t, 'sha256'), 'hex'), p_user);
  return t;
end $$;

create or replace function public.kikory_session_user(p_token text) returns uuid
language sql stable security definer set search_path = public, extensions as $$
  select user_id from kikory_sessions where token_hash = encode(digest(p_token, 'sha256'), 'hex');
$$;

create or replace function public.kikory_signup(p_pseudo text, p_password text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  p text := lower(trim(p_pseudo));
  u uuid;
begin
  if p !~ '^[a-z0-9._-]{3,24}$' then raise exception 'pseudo_invalide'; end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'mdp_court'; end if;
  if exists (select 1 from kikory_users where pseudo = p) then raise exception 'pseudo_pris'; end if;
  insert into kikory_users (pseudo, pass_hash) values (p, crypt(p_password, gen_salt('bf', 8))) returning id into u;
  return json_build_object('token', kikory_new_session(u), 'pseudo', p);
end $$;

create or replace function public.kikory_login(p_pseudo text, p_password text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  r kikory_users;
begin
  select * into r from kikory_users where pseudo = lower(trim(p_pseudo));
  if r.id is null or r.pass_hash <> crypt(coalesce(p_password, ''), r.pass_hash) then
    perform pg_sleep(0.5);
    raise exception 'identifiants';
  end if;
  return json_build_object('token', kikory_new_session(r.id), 'pseudo', r.pseudo, 'data', r.data);
end $$;

create or replace function public.kikory_load(p_token text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  r kikory_users;
begin
  select * into r from kikory_users where id = kikory_session_user(p_token);
  if r.id is null then raise exception 'session'; end if;
  return json_build_object('pseudo', r.pseudo, 'data', r.data);
end $$;

create or replace function public.kikory_save(p_token text, p_data jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  update kikory_users set data = p_data, updated_at = now() where id = kikory_session_user(p_token);
  if not found then raise exception 'session'; end if;
end $$;

create or replace function public.kikory_logout(p_token text) returns void
language sql security definer set search_path = public, extensions as $$
  delete from kikory_sessions where token_hash = encode(digest(p_token, 'sha256'), 'hex');
$$;

revoke execute on function public.kikory_new_session(uuid), public.kikory_session_user(text) from public, anon, authenticated;
grant execute on function
  public.kikory_signup(text, text), public.kikory_login(text, text), public.kikory_load(text),
  public.kikory_save(text, jsonb), public.kikory_logout(text)
  to anon;
