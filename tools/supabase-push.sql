-- Notifications Kikory (Web Push). À coller une fois dans Supabase > SQL Editor, après supabase.sql.
-- Chaque iPhone abonné envoie son programme de rappels ; pg_cron appelle chaque minute la fonction
-- kikory-push (supabase/functions/kikory-push), qui envoie ceux arrivés à échéance.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create table if not exists public.kikory_push_subs (
  endpoint text primary key check (endpoint ~ '^https://'),
  p256dh text not null,
  auth text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.kikory_push_queue (
  id bigint generated always as identity primary key,
  endpoint text not null references public.kikory_push_subs (endpoint) on delete cascade,
  at timestamptz not null,
  tag text,
  title text not null,
  body text,
  url text,
  claimed_at timestamptz
);
create index if not exists kikory_push_queue_due on public.kikory_push_queue (at) where claimed_at is null;

-- Paire de clés VAPID, créée par la fonction kikory-push à son premier appel.
create table if not exists public.kikory_push_keys (
  id int primary key default 1 check (id = 1),
  public text not null,
  private jsonb not null
);

alter table public.kikory_push_subs enable row level security;
alter table public.kikory_push_queue enable row level security;
alter table public.kikory_push_keys enable row level security;
revoke all on public.kikory_push_subs, public.kikory_push_queue, public.kikory_push_keys from anon, authenticated;

-- --- Appelées par l'app --------------------------------------------------------------------

-- Remplace le programme à venir d'un appareil : p_sub est l'abonnement du navigateur (endpoint + keys),
-- p_schedule une liste de { at (ms), tag, title, body, url }. Ce qui est déjà échu part quand même :
-- pg_cron passe chaque minute, l'app peut se resynchroniser entre-temps.
create or replace function public.kikory_push_sync(p_sub jsonb, p_schedule jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  e text := p_sub->>'endpoint';
begin
  if coalesce(e, '') !~ '^https://' or p_sub->'keys'->>'p256dh' is null or p_sub->'keys'->>'auth' is null then raise exception 'abonnement_invalide'; end if;
  if jsonb_typeof(p_schedule) <> 'array' or jsonb_array_length(p_schedule) > 60 then raise exception 'programme_invalide'; end if;
  insert into kikory_push_subs (endpoint, p256dh, auth) values (e, p_sub->'keys'->>'p256dh', p_sub->'keys'->>'auth')
    on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, updated_at = now();
  delete from kikory_push_queue where endpoint = e and claimed_at is null and at > now();
  insert into kikory_push_queue (endpoint, at, tag, title, body, url)
    select e, to_timestamp((x->>'at')::double precision / 1000), left(x->>'tag', 40), left(x->>'title', 120), left(x->>'body', 400), left(x->>'url', 200)
    from jsonb_array_elements(p_schedule) x
    where x->>'title' is not null and to_timestamp((x->>'at')::double precision / 1000) > now();
end $$;

create or replace function public.kikory_push_off(p_endpoint text) returns void
language sql security definer set search_path = public as $$
  delete from kikory_push_subs where endpoint = p_endpoint;
$$;

-- --- Appelées par la fonction kikory-push (rôle service) -----------------------------------

create or replace function public.kikory_push_keys() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('public', public, 'private', private) from kikory_push_keys where id = 1;
$$;

-- Le premier enregistrement l'emporte : deux appels simultanés repartent avec la même paire.
create or replace function public.kikory_push_keys_init(p_public text, p_private jsonb) returns json
language plpgsql security definer set search_path = public as $$
begin
  insert into kikory_push_keys (id, public, private) values (1, p_public, p_private) on conflict (id) do nothing;
  return kikory_push_keys();
end $$;

-- Réserve les notifications échues (une seule fois chacune) ; celles en retard de plus de 2 h sont abandonnées.
create or replace function public.kikory_push_claim() returns json
language plpgsql security definer set search_path = public as $$
declare
  r json;
begin
  delete from kikory_push_queue where at < now() - interval '2 hours';
  with due as (
    update kikory_push_queue set claimed_at = now()
    where id in (select id from kikory_push_queue where claimed_at is null and at <= now() for update skip locked)
    returning endpoint, title, body, tag, url
  )
  select coalesce(json_agg(json_build_object('endpoint', d.endpoint, 'p256dh', s.p256dh, 'auth', s.auth, 'title', d.title, 'body', d.body, 'tag', d.tag, 'url', d.url)), '[]'::json)
    into r from due d join kikory_push_subs s using (endpoint);
  return r;
end $$;

-- Abonnements refusés par Apple ou Google (app supprimée, notifications coupées) : on les oublie.
create or replace function public.kikory_push_gone(p_endpoints text[]) returns void
language sql security definer set search_path = public as $$
  delete from kikory_push_subs where endpoint = any(p_endpoints);
$$;

revoke execute on function
  public.kikory_push_sync(jsonb, jsonb), public.kikory_push_off(text), public.kikory_push_keys(),
  public.kikory_push_keys_init(text, jsonb), public.kikory_push_claim(), public.kikory_push_gone(text[])
  from public, anon, authenticated;
grant execute on function public.kikory_push_sync(jsonb, jsonb), public.kikory_push_off(text) to anon;
grant execute on function
  public.kikory_push_keys(), public.kikory_push_keys_init(text, jsonb), public.kikory_push_claim(), public.kikory_push_gone(text[])
  to service_role;

-- --- Envoi chaque minute, seulement s'il y a quelque chose à envoyer -----------------------------

select cron.schedule('kikory-push', '* * * * *', $$
  select net.http_post(url := 'https://ysonznudwriumikxckfw.supabase.co/functions/v1/kikory-push', body := '{}'::jsonb)
  where exists (select 1 from public.kikory_push_queue where claimed_at is null and at <= now())
$$);
