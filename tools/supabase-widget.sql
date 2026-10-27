-- Widget Kikory (Scriptable). À coller une fois dans Supabase > SQL Editor, après supabase.sql.
-- L'app range dans ses données un petit résumé (data->'widget') ; le widget le lit avec un code
-- propre à chaque compte, qui ne donne accès qu'à ce résumé. Un nouveau code remplace l'ancien.

alter table public.kikory_users add column if not exists widget_hash text unique;

create or replace function public.kikory_widget_code(p_token text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  c text := encode(gen_random_bytes(16), 'hex');
begin
  update kikory_users set widget_hash = encode(digest(c, 'sha256'), 'hex') where id = kikory_session_user(p_token);
  if not found then raise exception 'session'; end if;
  return c;
end $$;

create or replace function public.kikory_widget(p_code text) returns json
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  r kikory_users;
begin
  select * into r from kikory_users where widget_hash = encode(digest(coalesce(p_code, ''), 'sha256'), 'hex');
  if r.id is null then raise exception 'code'; end if;
  return json_build_object('pseudo', r.pseudo, 'widget', r.data->'widget');
end $$;

grant execute on function public.kikory_widget_code(text), public.kikory_widget(text) to anon;
